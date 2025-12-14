import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Node } from '../../entities/node.entity';
import { AlertEvent } from '../../entities/alert-event.entity';
import { AlertRule } from '../../entities/alert-rule.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AlertCheckerService {
  private readonly logger = new Logger(AlertCheckerService.name);

  constructor(
    @InjectRepository(Node)
    private nodeRepository: Repository<Node>,
    @InjectRepository(AlertEvent)
    private alertEventRepository: Repository<AlertEvent>,
    @InjectRepository(AlertRule)
    private alertRuleRepository: Repository<AlertRule>,
  ) {}

  /**
   * Check for offline nodes every 5 minutes
   */
  @Cron('*/5 * * * *')
  async checkOfflineNodes() {
    this.logger.log('🔍 Checking for offline nodes...');

    const now = new Date();
    const warningThreshold = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
    const criticalThreshold = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

    try {
      // Find nodes that haven't been seen in 30+ minutes
      const offlineNodes = await this.nodeRepository.find({
        where: {
          lastSeenAt: LessThan(warningThreshold),
        },
        relations: ['project', 'nodeModel'],
      });

      this.logger.log(`Found ${offlineNodes.length} potentially offline nodes`);

      for (const node of offlineNodes) {
        if (!node.lastSeenAt) {
          this.logger.warn(`Node ${node.code} has no lastSeenAt timestamp, skipping...`);
          continue;
        }

        const offlineDuration = now.getTime() - node.lastSeenAt.getTime();
        const offlineMinutes = Math.floor(offlineDuration / 60000);

        // Determine severity
        let severity: 'warning' | 'critical';
        if (node.lastSeenAt < criticalThreshold) {
          severity = 'critical';
        } else {
          severity = 'warning';
        }

        await this.createOrUpdateOfflineAlert(node, severity, offlineMinutes);
      }

      this.logger.log('✅ Offline node check completed');
    } catch (error) {
      this.logger.error(`❌ Error checking offline nodes: ${error.message}`, error.stack);
    }
  }

  /**
   * Create or update offline alert for a node
   */
  private async createOrUpdateOfflineAlert(
    node: Node,
    severity: 'warning' | 'critical',
    offlineMinutes: number,
  ) {
    try {
      // Find existing open offline alert for this node
      const existingAlert = await this.alertEventRepository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.alertRule', 'rule')
        .where('rule.rule_type = :ruleType', { ruleType: 'node_offline' })
        .andWhere('event.status = :status', { status: 'open' })
        .andWhere("event.note LIKE :nodeCode", {
          nodeCode: `%${node.code}%`
        })
        .getOne();

      if (existingAlert) {
        // Update existing alert
        existingAlert.value = offlineMinutes;
        existingAlert.updatedAt = new Date();

        await this.alertEventRepository.save(existingAlert);
        this.logger.log(
          `📝 Updated offline alert for node ${node.code} (${severity}, ${offlineMinutes}m)`,
        );
      } else {
        // Find or create alert rule for node offline
        let alertRule = await this.alertRuleRepository.findOne({
          where: {
            ruleType: 'node_offline',
          },
        });

        if (!alertRule) {
          // For now, skip if no rule exists
          // TODO: Create migration to allow nullable idSensorChannel for system-wide rules
          this.logger.warn('No node_offline alert rule found, skipping alert creation');
          return;
        }

        // Create new alert event
        const newAlert = this.alertEventRepository.create({
          idAlertEvent: uuidv4(),
          idAlertRule: alertRule.idAlertRule,
          triggeredAt: new Date(),
          value: offlineMinutes,
          status: 'open',
          note: `Node "${node.code}" has been offline for ${offlineMinutes} minutes. Last seen at ${node.lastSeenAt.toISOString()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await this.alertEventRepository.save(newAlert);
        this.logger.log(
          `🚨 Created offline alert for node ${node.code} (${severity}, ${offlineMinutes}m)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Error creating/updating alert for node ${node.code}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Auto-clear offline alerts when nodes come back online
   */
  @Cron('*/5 * * * *')
  async autoClearResolvedAlerts() {
    this.logger.log('🔍 Checking for resolved offline alerts...');

    const now = new Date();
    const onlineThreshold = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago

    try {
      // Find all open offline alerts
      const openOfflineAlerts = await this.alertEventRepository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.alertRule', 'rule')
        .where('rule.ruleType = :ruleType', { ruleType: 'node_offline' })
        .andWhere('event.status = :status', { status: 'open' })
        .getMany();

      this.logger.log(`Found ${openOfflineAlerts.length} open offline alerts to check`);

      for (const alert of openOfflineAlerts) {
        // Extract nodeId from alert rule params
        const params = alert.alertRule.paramsJson as any;
        if (!params || !params.nodeId) {
          // Try to find nodeId from alert note
          const noteMatch = alert.note?.match(/Node "([^"]+)"/);
          if (!noteMatch) continue;

          const nodeCode = noteMatch[1];
          const node = await this.nodeRepository.findOne({
            where: { code: nodeCode },
          });

          if (!node) continue;

          // Check if node is back online
          if (node.lastSeenAt && node.lastSeenAt > onlineThreshold) {
            alert.status = 'cleared';
            alert.clearedAt = new Date();
            // clearedBy left as-is (can be null for system auto-clear)
            alert.note += `\n\nAuto-cleared: Node came back online at ${node.lastSeenAt.toISOString()}`;
            alert.updatedAt = new Date();

            await this.alertEventRepository.save(alert);
            this.logger.log(`✅ Auto-cleared offline alert for node ${node.code}`);
          }
        }
      }

      this.logger.log('✅ Auto-clear check completed');
    } catch (error) {
      this.logger.error(`❌ Error auto-clearing alerts: ${error.message}`, error.stack);
    }
  }
}
