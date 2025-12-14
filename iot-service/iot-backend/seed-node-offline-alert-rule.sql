-- Seed Node Offline Alert Rule
-- This rule will be used to track nodes that haven't sent telemetry data

-- First, get a dummy sensor channel ID (we'll use the first one available)
-- In production, consider creating a dedicated system sensor channel

DO $$
DECLARE
  v_sensor_channel_id UUID;
  v_rule_id UUID;
BEGIN
  -- Get first sensor channel (or create dummy if needed)
  SELECT id_sensor_channel INTO v_sensor_channel_id
  FROM sensor_channels
  LIMIT 1;

  -- If no sensor channel exists, this will fail
  -- You may need to adjust based on your setup
  IF v_sensor_channel_id IS NULL THEN
    RAISE EXCEPTION 'No sensor channels found. Please create at least one sensor channel first.';
  END IF;

  -- Check if node_offline rule already exists
  SELECT id_alert_rule INTO v_rule_id
  FROM alert_rules
  WHERE rule_type = 'node_offline'
  LIMIT 1;

  -- Create rule if it doesn't exist
  IF v_rule_id IS NULL THEN
    INSERT INTO alert_rules (
      id_alert_rule,
      id_sensor_channel,
      rule_type,
      severity,
      params_json,
      enabled,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_sensor_channel_id,  -- Using first sensor channel as placeholder
      'node_offline',
      'warning',
      jsonb_build_object(
        'warningThresholdMinutes', 30,
        'criticalThresholdMinutes', 60,
        'description', 'Alert when node has not sent telemetry for specified duration'
      ),
      true,
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Created node_offline alert rule';
  ELSE
    RAISE NOTICE 'Node offline alert rule already exists with ID: %', v_rule_id;
  END IF;
END $$;

-- Verify the rule was created
SELECT 
  id_alert_rule,
  rule_type,
  severity,
  params_json,
  enabled
FROM alert_rules
WHERE rule_type = 'node_offline';
