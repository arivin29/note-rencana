#!/bin/bash
mosquitto_sub -h 109.105.194.174 -p 8366 -t "sensor/DEMO1-00D42390A994/telemetry" -C 1 | jq '{
  device: .device_id,
  uptime_hours: (.node.uptime_s / 3600 | floor),
  free_heap_kb: (.node.free_heap / 1024 | floor),
  csq: .node.lte.csq,
  state: .node.connection.state,
  lte_reconnects: .node.connection.lte_reconnects,
  mqtt_reconnects: .node.connection.mqtt_reconnects,
  publish_fail: .node.connection.publish_fail
}'
