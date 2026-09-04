# Documentation Index

Complete documentation for IoT Gateway service.

---

## 📚 Main Documentation

### Getting Started
- **[README.md](../README.md)** - Main documentation
- **[QUICK-START.md](../QUICK-START.md)** - Quick start guide (5 minutes)

### Core Features
- **[MQTT-COMMAND-RELAY-SPEC.md](MQTT-COMMAND-RELAY-SPEC.md)** - MQTT command & relay control specification
- **[TELEMETRY-PROCESSING.md](TELEMETRY-PROCESSING.md)** - Telemetry processing flow & logic
- **[TELTONIKA-INTEGRATION.md](TELTONIKA-INTEGRATION.md)** - Teltonika FM125 GPS tracker integration (NEW!)

### Quick References
- **[TELTONIKA-QUICK-REF.md](../TELTONIKA-QUICK-REF.md)** - Teltonika quick reference guide

### Operations
- **[On-prem client build (client-final)](../../client-final/docs/BUILD-TUTORIAL.md)** - Bundle gtw ke satu file `main.js` (esbuild, `npm run build:bundle` / `scripts/bundle.js`) + binary Go untuk server PDAM; spec: [ONPREM-SPEC.md](../../client-final/docs/ONPREM-SPEC.md). Flag terkait: `CLICKHOUSE_ENABLED=false`, `TELTONIKA_ENABLED=false`.
- **[MINIMAL-LOGGING.md](MINIMAL-LOGGING.md)** - Logging optimization & configuration
- **[LOGGING-QUICK-REF.md](LOGGING-QUICK-REF.md)** - Quick reference for logging modes

### Known Issues
- **[RS485-CONFIG-DUPLICATE-BUG.md](RS485-CONFIG-DUPLICATE-BUG.md)** - `stream_config` kirim blok RS485 dobel & ikut sensor nonaktif (belum diperbaiki, 4 Sep 2026)

### Latest Updates
- **[TODAY-FIXES.md](TODAY-FIXES.md)** - Latest fixes and updates (Nov 22, 2025)
- **[QUICK-SUMMARY.md](QUICK-SUMMARY.md)** - Quick summary of recent changes

---

## 🗂️ Archive Documentation

Older documentation and implementation notes (for reference only):

- **[docs/archive/](archive/)** - All archived documents
  - CEK-WAKTU-IMPLEMENTATION.md
  - CHECK-NESTJS-TERMINAL.md
  - DEBUG-GUIDE.md
  - IMPLEMENTATION-SUMMARY.md
  - RESTART-REQUIRED.md
  - SOLUTION.md
  - SUBSCRIBE-AND-SAVE-GUIDE.md
  - And more...

---

## 📖 Documentation Structure

```
iot-gtw/
├── README.md                    # Main documentation
├── QUICK-START.md              # Quick start guide
├── ecosystem.config.js         # PM2 configuration
├── .env.example                # Environment template
│
├── docs/                       # Documentation folder
│   ├── INDEX.md                # This file
│   ├── MQTT-COMMAND-RELAY-SPEC.md
│   ├── TELEMETRY-PROCESSING.md
│   ├── MINIMAL-LOGGING.md
│   ├── LOGGING-QUICK-REF.md
│   ├── TODAY-FIXES.md
│   ├── QUICK-SUMMARY.md
│   │
│   └── archive/                # Archived docs
│       ├── (old documents)
│       └── ...
│
└── scripts/                    # Utility scripts
    └── test/                   # Test scripts
        ├── check-iot-logs.js
        ├── test-mqtt-publish.js
        └── ...
```

---

## 🔍 Quick Navigation

### For Developers
1. Start with [QUICK-START.md](../QUICK-START.md)
2. Read [README.md](../README.md) for full details
3. Check [TELEMETRY-PROCESSING.md](TELEMETRY-PROCESSING.md) for processing logic

### For DevOps
1. Review [README.md](../README.md) deployment section
2. Configure using [.env.example](../.env.example)
3. Deploy with [ecosystem.config.js](../ecosystem.config.js)
4. Monitor using [LOGGING-QUICK-REF.md](LOGGING-QUICK-REF.md)

### For Features
1. [MQTT-COMMAND-RELAY-SPEC.md](MQTT-COMMAND-RELAY-SPEC.md) - Relay control
2. [TELEMETRY-PROCESSING.md](TELEMETRY-PROCESSING.md) - Data processing
3. [TODAY-FIXES.md](TODAY-FIXES.md) - Latest updates

### For Troubleshooting
1. Check [README.md - Troubleshooting](../README.md#troubleshooting)
2. Review [LOGGING-QUICK-REF.md](LOGGING-QUICK-REF.md)
3. Search in [archive/](archive/) for specific issues

---

## 📝 Document Maintenance

### Active Documents
Updated regularly, used for current development:
- README.md
- QUICK-START.md
- MQTT-COMMAND-RELAY-SPEC.md
- TELEMETRY-PROCESSING.md
- MINIMAL-LOGGING.md
- TODAY-FIXES.md

### Archive Documents
Historical reference only, not actively maintained:
- All files in `docs/archive/`

---

## 🤝 Contributing to Documentation

When adding new documentation:

1. **Main features** → Add to `docs/`
2. **Old/obsolete docs** → Move to `docs/archive/`
3. **Quick guides** → Add to root or update QUICK-START.md
4. **Update this index** → Add entry above

---

**Last Updated:** November 22, 2025  
**Maintainer:** Development Team
