# Quick Reference - Owners API Filters

## 🚀 Quick Start
**Base URL:** `http://localhost:3000/api/owners`

## 📋 All 18 Filter Parameters

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `page` | number | `?page=1` | Page number |
| `limit` | number | `?limit=10` | Items per page |
| `sortBy` | string | `?sortBy=name` | Sort field |
| `sortOrder` | ASC/DESC | `?sortOrder=ASC` | Sort direction |
| `search` | string | `?search=Water` | Multi-column search |
| `industry` | string | `?industry=Agriculture` | Single industry |
| `industries` | csv | `?industries=A,B` | Multiple industries |
| `slaLevel` | string | `?slaLevel=gold` | Single SLA |
| `slaLevels` | csv | `?slaLevels=gold,silver` | Multiple SLAs |
| `contactPerson` | string | `?contactPerson=John` | Contact name |
| `createdFrom` | date | `?createdFrom=2025-01-01` | Created after |
| `createdTo` | date | `?createdTo=2025-12-31` | Created before |
| `updatedFrom` | date | `?updatedFrom=2025-11-01` | Updated after |
| `updatedTo` | date | `?updatedTo=2025-11-30` | Updated before |
| `projectIds` | csv | `?projectIds=uuid1,uuid2` | Project UUIDs |
| `projectName` | string | `?projectName=Reservoir` | Project name |
| `projectStatus` | string | `?projectStatus=active` | Project status |
| `hasNodes` | boolean | `?hasNodes=true` | Has nodes |
| `hasActiveSensors` | boolean | `?hasActiveSensors=true` | Has sensors |
| `minProjects` | number | `?minProjects=1` | Min project count |
| `maxProjects` | number | `?maxProjects=10` | Max project count |

## 🔥 Common Examples

```bash
# Basic pagination
curl 'http://localhost:3000/api/owners?page=1&limit=10'

# Search
curl 'http://localhost:3000/api/owners?search=Water'

# Single filter
curl 'http://localhost:3000/api/owners?industry=Agriculture'

# Multiple values (WHERE IN)
curl 'http://localhost:3000/api/owners?industries=Agriculture,Water%20Treatment'

# Relations
curl 'http://localhost:3000/api/owners?hasNodes=true'
curl 'http://localhost:3000/api/owners?projectName=Reservoir'
curl 'http://localhost:3000/api/owners?minProjects=1'

# Combined
curl 'http://localhost:3000/api/owners?industries=Agriculture,Water%20Treatment&hasNodes=true&sortBy=name'
```

## 💡 Tips
- Space → `%20` (URL encode)
- `slaLevel` is case-insensitive
- All filters use AND logic
- Multiple values use comma-separation

**Docs:** http://localhost:3000/api
