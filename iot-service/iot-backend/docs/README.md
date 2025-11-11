# 📚 IoT Backend API Documentation

Welcome to the IoT Backend API documentation. This documentation is organized by topics and modules for easy navigation.

---

## 📁 Documentation Structure

```
docs/
├── README.md (this file)          ← Documentation index
├── architecture/                   ← System architecture docs
│   ├── API-ARCHITECTURE-GUIDE.md  ← API design patterns
│   └── RESTRUCTURE-GUIDE.md       ← Migration guide
└── modules/                        ← Per-module documentation
    └── owners/                     ← Owners module
        ├── README.md               ← Module overview
        ├── test-report.md          ← All endpoint tests
        ├── filtering-guide.md      ← Complete filtering guide
        ├── filtering-implementation.md  ← Technical details
        ├── filtering-test-report.md    ← Filter test results
        └── filtering-quick-reference.md ← Quick cheat sheet
```

---

## 🏗️ Architecture Documentation

### [API Architecture Guide](./architecture/API-ARCHITECTURE-GUIDE.md)
Comprehensive guide on API design patterns, structure, and best practices used in this project.

**Topics covered:**
- 3-tier architecture (Entity → DTO → Service → Controller)
- 3 types of GET operations (Simple, Nested, Aggregations)
- CRUD patterns
- Swagger/OpenAPI integration
- Validation and error handling

### [Restructure Guide](./architecture/RESTRUCTURE-GUIDE.md)
Migration guide from old structure to new organized structure.

**Topics covered:**
- Folder reorganization
- Entity separation
- DTO patterns
- Module structure
- Best practices

---

## 📦 Module Documentation

### [Owners Module](./modules/owners/)

Complete documentation for the Owners module, including all 13 endpoints, advanced filtering, and comprehensive test reports.

**Quick Links:**
- [📖 Module Overview](./modules/owners/README.md)
- [✅ Endpoint Test Report](./modules/owners/test-report.md) - 13/13 endpoints tested
- [🔍 Filtering Guide](./modules/owners/filtering-guide.md) - 18 filter parameters
- [⚡ Quick Reference](./modules/owners/filtering-quick-reference.md) - Cheat sheet

**Status:** ✅ Production Ready

---

## 🚀 Quick Start

### 1. View API Documentation (Swagger)
```bash
# Start the server
npm run start:dev

# Open Swagger UI
open http://localhost:3000/api
```

### 2. Test Endpoints
```bash
# List all owners
curl http://localhost:3000/api/owners

# Filter by industry
curl 'http://localhost:3000/api/owners?industry=Agriculture'

# Multiple filters
curl 'http://localhost:3000/api/owners?hasNodes=true&slaLevel=gold'
```

### 3. Read Module Documentation
Start with [Owners Module README](./modules/owners/README.md)

---

## 📊 Module Status

| Module | Status | Endpoints | Docs | Tests |
|--------|--------|-----------|------|-------|
| **Owners** | ✅ Complete | 13/13 | ✅ Full | ✅ 100% |
| Projects | ⏳ Planned | 0/13 | ⏳ Todo | ⏳ Todo |
| Nodes | ⏳ Planned | 0/13 | ⏳ Todo | ⏳ Todo |
| Sensors | ⏳ Planned | 0/13 | ⏳ Todo | ⏳ Todo |
| Telemetry | ⏳ Planned | 0/10 | ⏳ Todo | ⏳ Todo |
| Dashboards | ⏳ Planned | 0/8 | ⏳ Todo | ⏳ Todo |
| Alerts | ⏳ Planned | 0/10 | ⏳ Todo | ⏳ Todo |

---

## 🔗 External Resources

- **Swagger/OpenAPI:** http://localhost:3000/api
- **NestJS Docs:** https://docs.nestjs.com
- **TypeORM Docs:** https://typeorm.io
- **PostgreSQL Docs:** https://www.postgresql.org/docs/

---

## 📝 Documentation Guidelines

When creating new module documentation, follow this structure:

1. **README.md** - Module overview with quick links
2. **test-report.md** - Complete endpoint testing results
3. **filtering-guide.md** - Filtering capabilities (if applicable)
4. **examples.md** - Real-world usage examples (optional)

---

## 🤝 Contributing

When adding new modules or features, please:

1. Create module folder in `docs/modules/[module-name]/`
2. Add README.md with overview
3. Document all endpoints
4. Include test reports
5. Update this main README

---

**Last Updated:** November 11, 2025  
**API Version:** 1.0  
**Documentation Version:** 1.0
