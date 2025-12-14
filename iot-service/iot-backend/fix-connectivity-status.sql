-- Initial Cleanup: Fix Nodes with Incorrect Connectivity Status
-- Run this once to clean up seed data inconsistencies

-- ============================================================================
-- STEP 1: Fix nodes marked as 'online' but never sent telemetry
-- ============================================================================

UPDATE nodes 
SET 
    connectivity_status = 'offline',
    last_seen_at = NOW() - INTERVAL '1 day'  -- Set to past so it's clearly offline
WHERE 
    last_seen_at IS NULL 
    AND connectivity_status IN ('online', 'degraded');

-- ============================================================================
-- STEP 2: Fix nodes with old telemetry but still marked as 'online'
-- ============================================================================

-- Mark as offline if last_seen_at > 15 minutes ago
UPDATE nodes 
SET connectivity_status = 'offline'
WHERE 
    last_seen_at IS NOT NULL
    AND NOW() - last_seen_at > INTERVAL '15 minutes'
    AND connectivity_status IN ('online', 'degraded');

-- ============================================================================
-- STEP 3: Mark as degraded if last_seen_at between 5-15 minutes ago
-- ============================================================================

UPDATE nodes 
SET connectivity_status = 'degraded'
WHERE 
    last_seen_at IS NOT NULL
    AND NOW() - last_seen_at > INTERVAL '5 minutes'
    AND NOW() - last_seen_at <= INTERVAL '15 minutes'
    AND connectivity_status = 'online';

-- ============================================================================
-- VERIFICATION: Check results
-- ============================================================================

SELECT 
    '=== CONNECTIVITY STATUS SUMMARY ===' as info,
    connectivity_status, 
    COUNT(*) as count,
    ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM nodes) * 100, 1) as percentage
FROM nodes 
GROUP BY connectivity_status 
ORDER BY 
    CASE connectivity_status 
        WHEN 'online' THEN 1 
        WHEN 'degraded' THEN 2 
        WHEN 'offline' THEN 3 
    END;

SELECT 
    '=== NODES THAT NEVER SENT TELEMETRY ===' as info,
    code,
    connectivity_status,
    last_seen_at
FROM nodes 
WHERE last_seen_at IS NULL
ORDER BY code;

SELECT 
    '=== MOST RECENT TELEMETRY ===' as info,
    code,
    connectivity_status,
    last_seen_at,
    NOW() - last_seen_at as time_since_last_seen
FROM nodes 
WHERE last_seen_at IS NOT NULL
ORDER BY last_seen_at DESC
LIMIT 10;
