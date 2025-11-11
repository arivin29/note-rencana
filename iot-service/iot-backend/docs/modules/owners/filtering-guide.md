# Advanced Filtering & Search Guide

**Module:** Owners API  
**Endpoint:** `GET /api/owners`  
**Base URL:** `http://localhost:3000/api/owners`

---

## 📋 Table of Contents

1. [Basic Pagination](#1-basic-pagination)
2. [Sorting](#2-sorting)
3. [General Search](#3-general-search)
4. [Direct Column Filters](#4-direct-column-filters)
5. [Date Range Filters](#5-date-range-filters)
6. [Relation-Based Filters](#6-relation-based-filters-where-in)
7. [Combining Multiple Filters](#7-combining-multiple-filters)
8. [Example Use Cases](#8-example-use-cases)

---

## 1. Basic Pagination

### Parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

### Examples:

```bash
# Get first page with 10 items
curl 'http://localhost:3000/api/owners?page=1&limit=10'

# Get second page with 5 items
curl 'http://localhost:3000/api/owners?page=2&limit=5'

# Get all items (use large limit)
curl 'http://localhost:3000/api/owners?limit=1000'
```

### Response Structure:
```json
{
  "data": [...],
  "meta": {
    "total": 3,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

## 2. Sorting

### Parameters:
- `sortBy` - Field name (default: "createdAt")
- `sortOrder` - ASC or DESC (default: "DESC")

### Available Sort Fields:
- `name`
- `industry`
- `contactPerson`
- `slaLevel`
- `createdAt`
- `updatedAt`

### Examples:

```bash
# Sort by name ascending
curl 'http://localhost:3000/api/owners?sortBy=name&sortOrder=ASC'

# Sort by created date descending (newest first)
curl 'http://localhost:3000/api/owners?sortBy=createdAt&sortOrder=DESC'

# Sort by industry
curl 'http://localhost:3000/api/owners?sortBy=industry&sortOrder=ASC'
```

---

## 3. General Search

### Parameter:
- `search` - Keyword to search across multiple columns

### Searchable Columns:
- Owner name
- Industry
- Contact person

### Examples:

```bash
# Search for "Water" (matches name, industry, or contact)
curl 'http://localhost:3000/api/owners?search=Water'

# Search for "John"
curl 'http://localhost:3000/api/owners?search=John'

# Search is case-insensitive
curl 'http://localhost:3000/api/owners?search=water'
```

**Note:** Search uses `ILIKE` (case-insensitive partial match)

---

## 4. Direct Column Filters

### 4.1 Industry Filter

**Single Industry:**
```bash
# Filter by specific industry
curl 'http://localhost:3000/api/owners?industry=Agriculture'
```

**Multiple Industries (WHERE IN):**
```bash
# Filter by multiple industries (comma-separated)
curl 'http://localhost:3000/api/owners?industries=Agriculture,Water%20Treatment'

# Note: URL encode spaces as %20
curl 'http://localhost:3000/api/owners?industries=Water%20Management,Agriculture'
```

### 4.2 SLA Level Filter

**Single SLA Level:**
```bash
# Filter by SLA level (case-insensitive)
curl 'http://localhost:3000/api/owners?slaLevel=gold'
curl 'http://localhost:3000/api/owners?slaLevel=Gold'  # Same result
curl 'http://localhost:3000/api/owners?slaLevel=GOLD'  # Same result
```

**Multiple SLA Levels (WHERE IN):**
```bash
# Filter by multiple SLA levels (comma-separated)
curl 'http://localhost:3000/api/owners?slaLevels=gold,silver'
curl 'http://localhost:3000/api/owners?slaLevels=Gold,Silver,Bronze'
```

### 4.3 Contact Person Filter

```bash
# Partial match (case-insensitive)
curl 'http://localhost:3000/api/owners?contactPerson=John'
curl 'http://localhost:3000/api/owners?contactPerson=jane'
```

---

## 5. Date Range Filters

### Parameters:
- `createdFrom` - Filter by creation date from (ISO format)
- `createdTo` - Filter by creation date to (ISO format)
- `updatedFrom` - Filter by update date from (ISO format)
- `updatedTo` - Filter by update date to (ISO format)

### Examples:

```bash
# Owners created after January 1, 2025
curl 'http://localhost:3000/api/owners?createdFrom=2025-01-01'

# Owners created before December 31, 2025
curl 'http://localhost:3000/api/owners?createdTo=2025-12-31'

# Owners created in specific date range
curl 'http://localhost:3000/api/owners?createdFrom=2025-01-01&createdTo=2025-12-31'

# Owners updated in last 30 days
curl 'http://localhost:3000/api/owners?updatedFrom=2025-10-15&updatedTo=2025-11-15'

# Combine created and updated filters
curl 'http://localhost:3000/api/owners?createdFrom=2025-01-01&updatedFrom=2025-11-01'
```

**Date Format:** ISO 8601 format `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss.sssZ`

---

## 6. Relation-Based Filters (WHERE IN)

These filters query related tables to find owners that match specific criteria.

### 6.1 Filter by Project IDs

```bash
# Owners that have specific project(s)
curl 'http://localhost:3000/api/owners?projectIds=8d46e733-8ec3-43b3-8428-6a916ea82d17'

# Multiple project IDs (comma-separated)
curl 'http://localhost:3000/api/owners?projectIds=uuid1,uuid2,uuid3'
```

### 6.2 Filter by Project Name

```bash
# Owners that have projects with name containing "Reservoir"
curl 'http://localhost:3000/api/owners?projectName=Reservoir'

# Partial match, case-insensitive
curl 'http://localhost:3000/api/owners?projectName=reservoir'
```

### 6.3 Filter by Project Status

```bash
# Owners that have active projects
curl 'http://localhost:3000/api/owners?projectStatus=active'

# Owners that have inactive projects
curl 'http://localhost:3000/api/owners?projectStatus=inactive'
```

### 6.4 Filter by Node Existence

```bash
# Owners that have at least one node
curl 'http://localhost:3000/api/owners?hasNodes=true'

# Get owners without nodes (use inverse logic in your app)
# Note: Currently only supports "true" value
```

### 6.5 Filter by Active Sensors

```bash
# Owners that have active sensors
curl 'http://localhost:3000/api/owners?hasActiveSensors=true'
```

### 6.6 Filter by Project Count

**Minimum Projects:**
```bash
# Owners with at least 1 project
curl 'http://localhost:3000/api/owners?minProjects=1'

# Owners with at least 5 projects
curl 'http://localhost:3000/api/owners?minProjects=5'
```

**Maximum Projects:**
```bash
# Owners with at most 10 projects
curl 'http://localhost:3000/api/owners?maxProjects=10'

# Owners with exactly 3 projects (combine min and max)
curl 'http://localhost:3000/api/owners?minProjects=3&maxProjects=3'
```

**Project Count Range:**
```bash
# Owners with 1-5 projects
curl 'http://localhost:3000/api/owners?minProjects=1&maxProjects=5'
```

---

## 7. Combining Multiple Filters

All filters can be combined using `&` in the query string.

### Examples:

```bash
# Water industry with gold SLA, sorted by name
curl 'http://localhost:3000/api/owners?industry=Water%20Treatment&slaLevel=gold&sortBy=name&sortOrder=ASC'

# Multiple industries, has nodes, created in 2025
curl 'http://localhost:3000/api/owners?industries=Water%20Treatment,Agriculture&hasNodes=true&createdFrom=2025-01-01'

# Search + filters + sorting + pagination
curl 'http://localhost:3000/api/owners?search=Water&slaLevels=gold,silver&hasNodes=true&sortBy=name&page=1&limit=5'

# Complex filter: Active projects, has sensors, specific industries
curl 'http://localhost:3000/api/owners?industries=Agriculture,Water%20Management&projectStatus=active&hasActiveSensors=true&minProjects=1'

# Date range + relation filters
curl 'http://localhost:3000/api/owners?createdFrom=2025-01-01&createdTo=2025-12-31&projectName=Reservoir&hasNodes=true'
```

---

## 8. Example Use Cases

### Use Case 1: Dashboard - Active Water Utilities

**Requirement:** Show all water-related owners with active projects and nodes

```bash
curl 'http://localhost:3000/api/owners?industries=Water%20Treatment,Water%20Management&projectStatus=active&hasNodes=true&sortBy=name&sortOrder=ASC'
```

### Use Case 2: Premium Customers Report

**Requirement:** Gold/Silver SLA customers with at least 3 projects

```bash
curl 'http://localhost:3000/api/owners?slaLevels=gold,silver&minProjects=3&sortBy=name'
```

### Use Case 3: New Customers This Month

**Requirement:** Owners created in November 2025

```bash
curl 'http://localhost:3000/api/owners?createdFrom=2025-11-01&createdTo=2025-11-30&sortBy=createdAt&sortOrder=DESC'
```

### Use Case 4: Find by Contact Person

**Requirement:** Find all owners managed by specific person

```bash
curl 'http://localhost:3000/api/owners?contactPerson=John&sortBy=name'
```

### Use Case 5: Active Monitoring Systems

**Requirement:** Owners with active sensors for real-time monitoring

```bash
curl 'http://localhost:3000/api/owners?hasActiveSensors=true&projectStatus=active&sortBy=updatedAt&sortOrder=DESC'
```

### Use Case 6: Search and Filter

**Requirement:** Search "reservoir" in all fields, show only agriculture

```bash
curl 'http://localhost:3000/api/owners?search=reservoir&industry=Agriculture'
```

### Use Case 7: Pagination for Large Datasets

**Requirement:** Get 20 items per page, sorted by name

```bash
# Page 1
curl 'http://localhost:3000/api/owners?page=1&limit=20&sortBy=name&sortOrder=ASC'

# Page 2
curl 'http://localhost:3000/api/owners?page=2&limit=20&sortBy=name&sortOrder=ASC'
```

---

## 📊 Filter Performance Notes

### Indexed Columns (Fast):
- ✅ `idOwner` (Primary Key)
- ✅ `createdAt`
- ✅ `updatedAt`

### Non-Indexed Columns (Slower for large datasets):
- ⚠️ `name`
- ⚠️ `industry`
- ⚠️ `contactPerson`
- ⚠️ `slaLevel`

### Relation-Based Filters:
- ⚠️ Uses subqueries - may be slower on very large datasets
- ✅ Consider adding composite indexes for production

---

## 🔧 Swagger Documentation

All these filters are automatically documented in Swagger UI:

**Access:** http://localhost:3000/api

Click on **"GET /api/owners"** to see all available query parameters with descriptions and examples.

---

## 💡 Tips

1. **URL Encoding:** Always encode special characters (spaces, commas in values)
   - Space: `%20` or `+`
   - Comma in value: `%2C`

2. **Case Sensitivity:**
   - `industry` - Case-sensitive
   - `slaLevel` - Case-insensitive (converted to lowercase)
   - `search` - Case-insensitive (uses ILIKE)

3. **Performance:**
   - Use specific filters instead of broad search when possible
   - Limit results with pagination
   - Consider caching frequent queries

4. **Combining Filters:**
   - All filters use AND logic
   - For OR logic, use comma-separated values (e.g., `industries=A,B`)

5. **Empty Results:**
   - Returns empty array with `total: 0` in meta
   - HTTP 200 status (not 404)

---

## 🚀 Next Steps

This filtering pattern can be replicated to other modules:
- Projects Module
- Nodes Module
- Sensors Module
- Telemetry Module

Each module will have its own specific filters based on its columns and relations.
