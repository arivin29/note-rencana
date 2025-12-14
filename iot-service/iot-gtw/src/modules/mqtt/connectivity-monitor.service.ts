import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { Node } from '../../entities/existing';

/**
 * Connectivity Monitor Service
 * 
 * Automatically monitors node connectivity based on last_seen_at timestamp:
 * - ONLINE: Last seen within 5 minutes
 * - DEGRADED: Last seen 5-15 minutes ago
 * - OFFLINE: Last seen > 15 minutes ago
 */
@Injectable()
export class ConnectivityMonitorService implements OnModuleInit {
    private readonly logger = new Logger(ConnectivityMonitorService.name);

    // Thresholds (in milliseconds)
    private readonly DEGRADED_THRESHOLD = 5 * 60 * 1000;  // 5 minutes
    private readonly OFFLINE_THRESHOLD = 15 * 60 * 1000;  // 15 minutes

    constructor(
        @InjectRepository(Node)
        private readonly nodeRepository: Repository<Node>,
    ) {}

    /**
     * Run initial cleanup on module startup
     * Fix nodes with incorrect status from seed data
     */
    async onModuleInit() {
        this.logger.log('🔧 Running initial connectivity status cleanup...');
        await this.initialCleanup();
    }

    /**
     * Initial cleanup: Fix nodes with incorrect connectivity status
     * - Nodes with last_seen_at = NULL should be offline
     * - Nodes with old last_seen_at should be offline/degraded based on threshold
     */
    private async initialCleanup(): Promise<void> {
        try {
            const now = new Date();

            // Fix nodes that never sent telemetry (last_seen_at IS NULL)
            const neverSeenNodes = await this.nodeRepository.find({
                where: {
                    lastSeenAt: IsNull(),
                    connectivityStatus: 'online', // or 'degraded'
                },
            });

            for (const node of neverSeenNodes) {
                node.connectivityStatus = 'offline';
                node.lastSeenAt = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Set to 1 day ago
                await this.nodeRepository.save(node);
                this.logger.warn(`🔴 Initial cleanup: ${node.code} → OFFLINE (never sent telemetry)`);
            }

            // Run normal connectivity check to fix other inconsistencies
            await this.checkNodeConnectivity();

            this.logger.log(`✅ Initial cleanup complete: ${neverSeenNodes.length} nodes fixed`);
        } catch (error) {
            this.logger.error(`❌ Failed initial cleanup: ${error.message}`, error.stack);
        }
    }

    /**
     * Run every minute to check node connectivity status
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async checkNodeConnectivity(): Promise<void> {
        try {
            const now = new Date();
            const degradedCutoff = new Date(now.getTime() - this.DEGRADED_THRESHOLD);
            const offlineCutoff = new Date(now.getTime() - this.OFFLINE_THRESHOLD);

            this.logger.debug('🔍 Checking node connectivity...');

            // Find nodes that should be marked as OFFLINE
            const offlineNodes = await this.nodeRepository.find({
                where: {
                    lastSeenAt: LessThan(offlineCutoff),
                    connectivityStatus: 'online', // or 'degraded'
                },
            });

            // Update to OFFLINE
            for (const node of offlineNodes) {
                const oldStatus = node.connectivityStatus;
                node.connectivityStatus = 'offline';
                await this.nodeRepository.save(node);
                
                this.logger.warn(
                    `🔴 Node ${node.code} → OFFLINE (last seen: ${node.lastSeenAt?.toISOString() || 'never'}, was: ${oldStatus})`
                );
            }

            // Find nodes that should be marked as DEGRADED
            const degradedNodes = await this.nodeRepository.find({
                where: {
                    lastSeenAt: LessThan(degradedCutoff),
                    connectivityStatus: 'online',
                },
            });

            // Update to DEGRADED (only if not already offline)
            for (const node of degradedNodes) {
                // Double-check it's not actually offline
                if (node.lastSeenAt && (now.getTime() - node.lastSeenAt.getTime()) < this.OFFLINE_THRESHOLD) {
                    node.connectivityStatus = 'degraded';
                    await this.nodeRepository.save(node);
                    
                    this.logger.warn(
                        `🟡 Node ${node.code} → DEGRADED (last seen: ${node.lastSeenAt?.toISOString()})`
                    );
                }
            }

            if (offlineNodes.length === 0 && degradedNodes.length === 0) {
                this.logger.debug('✅ All nodes connectivity status up-to-date');
            } else {
                this.logger.log(
                    `📊 Connectivity check complete: ${offlineNodes.length} offline, ${degradedNodes.length} degraded`
                );
            }

        } catch (error) {
            this.logger.error(`❌ Failed to check node connectivity: ${error.message}`, error.stack);
        }
    }

    /**
     * Get connectivity statistics
     */
    async getConnectivityStats(): Promise<{
        online: number;
        degraded: number;
        offline: number;
        total: number;
    }> {
        const [online, degraded, offline, total] = await Promise.all([
            this.nodeRepository.count({ where: { connectivityStatus: 'online' } }),
            this.nodeRepository.count({ where: { connectivityStatus: 'degraded' } }),
            this.nodeRepository.count({ where: { connectivityStatus: 'offline' } }),
            this.nodeRepository.count(),
        ]);

        return { online, degraded, offline, total };
    }

    /**
     * Manually trigger connectivity check (for testing)
     */
    async triggerManualCheck(): Promise<void> {
        this.logger.log('🔧 Manual connectivity check triggered');
        await this.checkNodeConnectivity();
    }
}
