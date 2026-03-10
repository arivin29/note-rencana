# OpenSearch Index Templates

**Date:** 2026-02-27  
**Status:** 📋 Design Phase  
**Version:** 1.0

---

## 1. Overview

### 1.1 Index Naming Convention

```
sensor-telemetry-10min-{YYYY.MM}    # Monthly indices for telemetry
anomaly-results-{YYYY.MM}           # Monthly indices for anomalies
.opendistro-ad-*                    # Internal ML indices (auto-created)
```

### 1.2 Index Lifecycle

| Index Pattern | Retention | Rollover |
|---------------|-----------|----------|
| `sensor-telemetry-10min-*` | 6 months | Monthly |
| `anomaly-results-*` | 3 months | Monthly |

---

## 2. Sensor Telemetry Index Template

### 2.1 Template Definition

```json
{
  "name": "sensor-telemetry-10min-template",
  "index_patterns": ["sensor-telemetry-10min-*"],
  "template": {
    "settings": {
      "index": {
        "number_of_shards": 2,
        "number_of_replicas": 0,
        "refresh_interval": "30s",
        "codec": "best_compression"
      },
      "analysis": {
        "normalizer": {
          "lowercase": {
            "type": "custom",
            "filter": ["lowercase"]
          }
        }
      }
    },
    "mappings": {
      "dynamic": "strict",
      "properties": {
        "@timestamp": {
          "type": "date",
          "format": "strict_date_optional_time||epoch_millis"
        },
        "time_bucket": {
          "type": "date",
          "format": "strict_date_optional_time||epoch_millis"
        },
        
        "owner_code": {
          "type": "keyword",
          "normalizer": "lowercase"
        },
        "project_id": {
          "type": "keyword"
        },
        "project_code": {
          "type": "keyword",
          "normalizer": "lowercase"
        },
        "node_id": {
          "type": "keyword"
        },
        "node_code": {
          "type": "keyword",
          "normalizer": "lowercase"
        },
        "sensor_id": {
          "type": "keyword"
        },
        "sensor_label": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "channel_id": {
          "type": "keyword"
        },
        
        "metric_code": {
          "type": "keyword",
          "normalizer": "lowercase"
        },
        "metric_unit": {
          "type": "keyword"
        },
        
        "avg_raw": {
          "type": "float"
        },
        "avg_eng": {
          "type": "float"
        },
        "min_eng": {
          "type": "float"
        },
        "max_eng": {
          "type": "float"
        },
        "sample_count": {
          "type": "integer"
        },
        
        "min_threshold": {
          "type": "float"
        },
        "max_threshold": {
          "type": "float"
        }
      }
    }
  },
  "priority": 100,
  "version": 1,
  "_meta": {
    "description": "Template for sensor telemetry 10-minute aggregates",
    "created_by": "iot-gtw",
    "created_at": "2026-02-27"
  }
}
```

### 2.2 TypeScript Definition

```typescript
// src/modules/ml/interfaces/opensearch-document.interface.ts

export interface SensorTelemetryDocument {
  '@timestamp': string;
  time_bucket: string;
  
  // Hierarchy
  owner_code: string;
  project_id: string;
  project_code: string;
  node_id: string;
  node_code: string;
  sensor_id: string;
  sensor_label: string;
  channel_id: string;
  
  // Metric info
  metric_code: string;
  metric_unit: string;
  
  // Values
  avg_raw: number;
  avg_eng: number;
  min_eng: number;
  max_eng: number;
  sample_count: number;
  
  // Thresholds (from PostgreSQL)
  min_threshold: number | null;
  max_threshold: number | null;
}
```

---

## 3. Anomaly Results Index Template

### 3.1 Template Definition

```json
{
  "name": "anomaly-results-template",
  "index_patterns": ["anomaly-results-*"],
  "template": {
    "settings": {
      "index": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
        "refresh_interval": "10s"
      }
    },
    "mappings": {
      "dynamic": "strict",
      "properties": {
        "@timestamp": {
          "type": "date"
        },
        
        "anomaly_id": {
          "type": "keyword"
        },
        "detector_id": {
          "type": "keyword"
        },
        "detector_name": {
          "type": "keyword"
        },
        
        "owner_code": {
          "type": "keyword"
        },
        "project_id": {
          "type": "keyword"
        },
        "project_code": {
          "type": "keyword"
        },
        "node_id": {
          "type": "keyword"
        },
        "node_code": {
          "type": "keyword"
        },
        "channel_id": {
          "type": "keyword"
        },
        "metric_code": {
          "type": "keyword"
        },
        
        "anomaly_score": {
          "type": "float"
        },
        "anomaly_grade": {
          "type": "keyword"
        },
        "anomaly_type": {
          "type": "keyword"
        },
        
        "actual_value": {
          "type": "float"
        },
        "expected_value": {
          "type": "float"
        },
        "deviation": {
          "type": "float"
        },
        
        "confidence": {
          "type": "float"
        },
        "threshold_breached": {
          "type": "boolean"
        },
        
        "status": {
          "type": "keyword"
        },
        "pg_anomaly_result_id": {
          "type": "keyword"
        },
        "pg_alert_event_id": {
          "type": "keyword"
        }
      }
    }
  },
  "priority": 100,
  "version": 1,
  "_meta": {
    "description": "Template for ML anomaly detection results",
    "created_by": "iot-gtw"
  }
}
```

### 3.2 TypeScript Definition

```typescript
// src/modules/ml/interfaces/anomaly-document.interface.ts

export interface AnomalyResultDocument {
  '@timestamp': string;
  
  // Identifiers
  anomaly_id: string;
  detector_id: string;
  detector_name: string;
  
  // Hierarchy
  owner_code: string;
  project_id: string;
  project_code: string;
  node_id: string;
  node_code: string;
  channel_id: string;
  metric_code: string;
  
  // Anomaly metrics
  anomaly_score: number;      // 0.0 - 1.0
  anomaly_grade: AnomalyGrade;
  anomaly_type: AnomalyType;
  
  // Values
  actual_value: number;
  expected_value: number;
  deviation: number;          // Percentage (e.g., 0.35 = 35%)
  
  // Additional
  confidence: number;
  threshold_breached: boolean;
  
  // Status
  status: 'open' | 'acknowledged' | 'resolved';
  
  // PostgreSQL references
  pg_anomaly_result_id: string | null;
  pg_alert_event_id: string | null;
}

export type AnomalyGrade = 'mild' | 'moderate' | 'severe' | 'critical';

export type AnomalyType = 
  | 'threshold_breach'
  | 'forecast_deviation'
  | 'spike'
  | 'drop'
  | 'flatline'
  | 'oscillation'
  | 'drift';
```

---

## 4. ML Detector Configuration

### 4.1 Pressure Detector (High Cardinality)

```json
{
  "name": "pdam-pressure-detector",
  "description": "Detect pressure anomalies per channel",
  "time_field": "time_bucket",
  "indices": ["sensor-telemetry-10min-*"],
  "filter_query": {
    "bool": {
      "must": [
        { "term": { "metric_code": "tekanan" } }
      ]
    }
  },
  "feature_attributes": [
    {
      "feature_name": "pressure_avg",
      "feature_enabled": true,
      "importance": 5,
      "aggregation_query": {
        "pressure_avg": {
          "avg": {
            "field": "avg_eng"
          }
        }
      }
    },
    {
      "feature_name": "pressure_range",
      "feature_enabled": true,
      "importance": 3,
      "aggregation_query": {
        "pressure_range": {
          "bucket_script": {
            "buckets_path": {
              "max": "max_eng",
              "min": "min_eng"
            },
            "script": "params.max - params.min"
          }
        }
      }
    }
  ],
  "detection_interval": {
    "period": {
      "interval": 10,
      "unit": "MINUTES"
    }
  },
  "window_delay": {
    "period": {
      "interval": 2,
      "unit": "MINUTES"
    }
  },
  "shingle_size": 8,
  "category_field": ["channel_id"],
  "result_index": "anomaly-results-pressure"
}
```

### 4.2 Flow Detector

```json
{
  "name": "pdam-flow-detector",
  "description": "Detect flow rate anomalies per channel",
  "time_field": "time_bucket",
  "indices": ["sensor-telemetry-10min-*"],
  "filter_query": {
    "bool": {
      "must": [
        { "term": { "metric_code": "flow" } }
      ]
    }
  },
  "feature_attributes": [
    {
      "feature_name": "flow_avg",
      "feature_enabled": true,
      "importance": 5,
      "aggregation_query": {
        "flow_avg": {
          "avg": {
            "field": "avg_eng"
          }
        }
      }
    }
  ],
  "detection_interval": {
    "period": {
      "interval": 10,
      "unit": "MINUTES"
    }
  },
  "window_delay": {
    "period": {
      "interval": 2,
      "unit": "MINUTES"
    }
  },
  "shingle_size": 8,
  "category_field": ["channel_id"]
}
```

### 4.3 Level Detector

```json
{
  "name": "pdam-level-detector",
  "description": "Detect water level anomalies per channel",
  "time_field": "time_bucket",
  "indices": ["sensor-telemetry-10min-*"],
  "filter_query": {
    "bool": {
      "must": [
        { "term": { "metric_code": "level" } }
      ]
    }
  },
  "feature_attributes": [
    {
      "feature_name": "level_avg",
      "feature_enabled": true,
      "importance": 5,
      "aggregation_query": {
        "level_avg": {
          "avg": {
            "field": "avg_eng"
          }
        }
      }
    },
    {
      "feature_name": "level_change_rate",
      "feature_enabled": true,
      "importance": 4,
      "aggregation_query": {
        "level_change": {
          "derivative": {
            "buckets_path": "avg_eng"
          }
        }
      }
    }
  ],
  "detection_interval": {
    "period": {
      "interval": 10,
      "unit": "MINUTES"
    }
  },
  "window_delay": {
    "period": {
      "interval": 2,
      "unit": "MINUTES"
    }
  },
  "shingle_size": 8,
  "category_field": ["channel_id"]
}
```

### 4.4 Universal Detector (Catch-all)

```json
{
  "name": "pdam-universal-detector",
  "description": "Detect anomalies for all other metrics",
  "time_field": "time_bucket",
  "indices": ["sensor-telemetry-10min-*"],
  "filter_query": {
    "bool": {
      "must_not": [
        { "terms": { "metric_code": ["tekanan", "flow", "level"] } }
      ]
    }
  },
  "feature_attributes": [
    {
      "feature_name": "value_avg",
      "feature_enabled": true,
      "aggregation_query": {
        "value_avg": {
          "avg": {
            "field": "avg_eng"
          }
        }
      }
    }
  ],
  "detection_interval": {
    "period": {
      "interval": 10,
      "unit": "MINUTES"
    }
  },
  "window_delay": {
    "period": {
      "interval": 2,
      "unit": "MINUTES"
    }
  },
  "shingle_size": 8,
  "category_field": ["channel_id", "metric_code"]
}
```

---

## 5. Detector Management API

### 5.1 Create Detector

```bash
# Create detector
POST /_plugins/_anomaly_detection/detectors
{
  <detector_config_from_above>
}

# Response
{
  "_id": "detector_uuid",
  "_version": 1,
  "anomaly_detector": { ... }
}
```

### 5.2 Start Detector

```bash
# Start real-time detection
POST /_plugins/_anomaly_detection/detectors/{detector_id}/_start

# Response
{
  "_id": "detector_uuid",
  "state": "RUNNING"
}
```

### 5.3 Get Detector Results

```bash
# Query anomaly results
POST /_plugins/_anomaly_detection/detectors/results/_search
{
  "query": {
    "bool": {
      "filter": [
        { "term": { "detector_id": "{detector_id}" } },
        { "range": { "data_start_time": { "gte": "now-1h" } } }
      ],
      "must": [
        { "range": { "anomaly_grade": { "gte": 0.5 } } }
      ]
    }
  },
  "sort": [{ "data_start_time": "desc" }],
  "size": 100
}
```

---

## 6. Index Management

### 6.1 Create Initial Indices

```bash
# Create current month index for telemetry
PUT /sensor-telemetry-10min-2026.02
{
  "settings": {
    "number_of_shards": 2,
    "number_of_replicas": 0
  }
}

# Create current month index for anomaly results
PUT /anomaly-results-2026.02
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  }
}
```

### 6.2 Index Lifecycle Policy (ILM)

```json
{
  "policy": {
    "description": "Policy for sensor telemetry indices",
    "default_state": "hot",
    "states": [
      {
        "name": "hot",
        "actions": [],
        "transitions": [
          {
            "state_name": "warm",
            "conditions": {
              "min_index_age": "30d"
            }
          }
        ]
      },
      {
        "name": "warm",
        "actions": [
          {
            "read_only": {}
          },
          {
            "force_merge": {
              "max_num_segments": 1
            }
          }
        ],
        "transitions": [
          {
            "state_name": "delete",
            "conditions": {
              "min_index_age": "180d"
            }
          }
        ]
      },
      {
        "name": "delete",
        "actions": [
          {
            "delete": {}
          }
        ]
      }
    ],
    "ism_template": {
      "index_patterns": ["sensor-telemetry-10min-*"],
      "priority": 100
    }
  }
}
```

---

## 7. TypeScript Constants

```typescript
// src/modules/ml/constants/index-templates.ts

export const INDEX_TEMPLATES = {
  TELEMETRY_10MIN: {
    name: 'sensor-telemetry-10min-template',
    pattern: 'sensor-telemetry-10min-*',
    indexPrefix: 'sensor-telemetry-10min-',
  },
  ANOMALY_RESULTS: {
    name: 'anomaly-results-template',
    pattern: 'anomaly-results-*',
    indexPrefix: 'anomaly-results-',
  },
};

export const DETECTOR_CONFIGS = {
  PRESSURE: 'pdam-pressure-detector',
  FLOW: 'pdam-flow-detector',
  LEVEL: 'pdam-level-detector',
  UNIVERSAL: 'pdam-universal-detector',
};

export function getIndexName(prefix: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${prefix}${year}.${month}`;
}
```

---

## 8. Validation Queries

### 8.1 Check Index Mapping

```bash
GET /sensor-telemetry-10min-2026.02/_mapping
```

### 8.2 Check Document Count

```bash
GET /sensor-telemetry-10min-*/_count
```

### 8.3 Sample Query

```bash
GET /sensor-telemetry-10min-*/_search
{
  "query": {
    "bool": {
      "filter": [
        { "term": { "metric_code": "tekanan" } },
        { "range": { "time_bucket": { "gte": "now-1h" } } }
      ]
    }
  },
  "size": 10,
  "sort": [{ "time_bucket": "desc" }]
}
```

---

## 9. Related Documents

- [02-DATA-FLOW.md](02-DATA-FLOW.md) - Data flow diagrams
- [03-SERVICE-ARCHITECTURE.md](03-SERVICE-ARCHITECTURE.md) - Service structure
- [05-API-DESIGN.md](05-API-DESIGN.md) - API specification

---

**Next:** API Endpoints Design
