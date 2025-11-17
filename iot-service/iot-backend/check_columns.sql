SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sensor_channels'
ORDER BY ordinal_position;
