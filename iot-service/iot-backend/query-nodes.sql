-- Check total nodes and their connectivity status
SELECT 
    connectivity_status,
    COUNT(*) as count
FROM nodes
GROUP BY connectivity_status
ORDER BY count DESC;

-- Show detailed node info (first 10 online nodes)
SELECT 
    code,
    connectivity_status,
    last_seen_at,
    id_project
FROM nodes
WHERE connectivity_status = 'online'
LIMIT 10;
