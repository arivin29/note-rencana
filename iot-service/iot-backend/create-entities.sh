#!/bin/bash

# Script untuk generate semua entity files
# Jalankan dari root folder iot-backend

echo "Generating all entity files..."

# Array of entity names
entities=(
  "node-model"
  "node"
  "node-assignment"
  "sensor-type"
  "sensor-catalog"
  "sensor"
  "sensor-channel"
  "sensor-log"
  "alert-rule"
  "alert-event"
  "user-dashboard"
  "dashboard-widget"
  "owner-forwarding-webhook"
  "owner-forwarding-database"
  "owner-forwarding-log"
)

for entity in "${entities[@]}"; do
  touch "src/entities/${entity}.entity.ts"
  echo "Created ${entity}.entity.ts"
done

echo "All entity files created!"
