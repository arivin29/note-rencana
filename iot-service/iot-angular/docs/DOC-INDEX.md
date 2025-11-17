# 📚 Documentation Index

Quick navigation to all documentation files in this project.

---

## 🎯 Start Here

### 1. **[../README.md](../README.md)** - Project Overview
   - Quick start commands
   - Tech stack
   - Project structure
   - Getting started guide

---

## 🚀 SDK Integration (Main Focus)

### 2. **[TEAM-SDK-GUIDE.md](./TEAM-SDK-GUIDE.md)** ⭐ MAIN GUIDE
   - **What**: Complete SDK integration guide
   - **For**: All developers using SDK
   - **Contains**:
     - SDK location & structure
     - How to generate/update SDK
     - Import patterns
     - Observable pattern (team standard)
     - All CRUD operations with examples
     - Best practices
     - Available services & endpoints

### 3. **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** 📋 CHEAT SHEET
   - **What**: Quick commands & code snippets
   - **For**: Daily reference during development
   - **Contains**:
     - Commands (generate SDK, run dev server)
     - Import examples
     - Common operations (Get, Create, Update, Delete)
     - Filter patterns
     - Anti-patterns (what NOT to do)
     - Troubleshooting table

### 4. **[SDK-SETUP-COMPLETE.md](./SDK-SETUP-COMPLETE.md)** ✅ STATUS
   - **What**: Setup summary & completion status
   - **For**: Check what's configured, verify setup
   - **Contains**:
     - What's been completed
     - Configuration summary
     - Available endpoints
     - Success criteria checklist
     - Next steps when backend changes

### 5. **[SDK-GENERATION-FAQ.md](./SDK-GENERATION-FAQ.md)** ❓ FAQ
   - **What**: Common questions & troubleshooting
   - **For**: When you encounter issues
   - **Contains**:
     - Why SDK doesn't generate all modules
     - Common errors & solutions
     - Backend-first approach explanation

---

## 🎨 Feature-Specific Guides

### 6. **[SENSOR-DETAIL-GUIDE.md](./SENSOR-DETAIL-GUIDE.md)**
   - **What**: Sensor detail page implementation
   - **For**: Working with sensor detail features
   - **Contains**: Component structure, data flow, UI patterns

### 7. **[WIDGET-SYSTEM-README.md](./WIDGET-SYSTEM-README.md)**
   - **What**: Widget system documentation
   - **For**: Creating & using dashboard widgets
   - **Contains**: Widget architecture, available widgets, usage

### 8. **[DASHBOARD-README.md](./DASHBOARD-README.md)**
   - **What**: Dashboard implementation guide
   - **For**: Understanding dashboard structure
   - **Contains**: Dashboard components, data flow, widget integration

### 9. **[DASHBOARD-IMPLEMENTATION-COMPLETE.md](./DASHBOARD-IMPLEMENTATION-COMPLETE.md)**
   - **What**: Dashboard implementation completion report
   - **For**: Understanding what's been implemented
   - **Contains**: Completed features, testing results, next steps

---

## 🔧 Technical Reference

### 10. **[NODE-DETAIL-DATA-MAPPING.md](./NODE-DETAIL-DATA-MAPPING.md)**
   - **What**: Node detail data mapping guide
   - **For**: Working with node detail pages
   - **Contains**: Data structure mappings, field relationships

### 11. **[OWNERS-LIST-IMPLEMENTATION.md](./OWNERS-LIST-IMPLEMENTATION.md)**
   - **What**: Owners list implementation guide
   - **For**: Understanding owners module
   - **Contains**: List implementation, CRUD operations

### 12. **[DASHBOARD-WIDGET-MAPPING.md](./DASHBOARD-WIDGET-MAPPING.md)**
   - **What**: Widget to component mapping
   - **For**: Understanding widget configurations
   - **Contains**: Widget types, component mappings

### 13. **[DTO-HTML-MISMATCH-FIXES.md](./DTO-HTML-MISMATCH-FIXES.md)**
   - **What**: DTO and HTML field alignment fixes
   - **For**: Reference for past bug fixes
   - **Contains**: Fixed mismatches, lessons learned

### 14. **[ORGANIZATION.md](./ORGANIZATION.md)**
   - **What**: Project organization documentation
   - **For**: Understanding project structure
   - **Contains**: Folder structure, naming conventions

---

## 📋 Meta Documentation

### 15. **[CLEANUP-REPORT.md](./CLEANUP-REPORT.md)**
   - **What**: Documentation cleanup history
   - **For**: Understanding documentation evolution
   - **Contains**: Cleanup actions, files removed, improvements

### 16. **[README.md](./README.md)**
   - **What**: Docs folder overview
   - **For**: Quick docs folder navigation
   - **Contains**: Summary of all documentation files

---

## 📖 How to Use This Documentation

### For New Developers:
1. Start with **[README.md](./README.md)** for project overview
2. Read **[TEAM-SDK-GUIDE.md](./TEAM-SDK-GUIDE.md)** to understand SDK integration
3. Keep **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** open while coding
4. Check **[SDK-GENERATION-FAQ.md](./SDK-GENERATION-FAQ.md)** if you hit issues

### For Daily Work:
- Use **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** as cheat sheet
- Reference **[TEAM-SDK-GUIDE.md](./TEAM-SDK-GUIDE.md)** for patterns

### When Backend Changes:
1. Run: `npm run generate-api`
2. Check **[SDK-SETUP-COMPLETE.md](./SDK-SETUP-COMPLETE.md)** for what's updated

### When Issues Occur:
- Check **[SDK-GENERATION-FAQ.md](./SDK-GENERATION-FAQ.md)** first
- See troubleshooting section in **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)**

---

## 🎯 Most Important Files

| Priority | File | Purpose |
|----------|------|---------|
| ⭐⭐⭐ | **TEAM-SDK-GUIDE.md** | Main comprehensive guide |
| ⭐⭐⭐ | **QUICK-REFERENCE.md** | Daily cheat sheet |
| ⭐⭐ | **README.md** | Project overview & quick start |
| ⭐⭐ | **SDK-GENERATION-FAQ.md** | Troubleshooting |
| ⭐ | **SDK-SETUP-COMPLETE.md** | Setup status |

---

## 🧹 Documentation Cleanup History

### Cleanup #1 (2024-11-11)
**Removed obsolete files**:
- ❌ QUICK-REFERENCE-OLD.md (old backup)
- ❌ SERVICE-WRAPPER-FAQ.md (team doesn't use wrapper)
- ❌ SERVICE-WRAPPER-PATTERN.md (obsolete pattern)
- ❌ SDK-GENERATION-SUMMARY.md (duplicate info)
- ❌ SDK-INTEGRATION-GUIDE.md (duplicate)
- ❌ ARCHITECTURE-VISUAL-GUIDE.md (too detailed)
- ❌ DIRECT-SDK-PATTERN.md (info merged to main guide)
- ❌ TESTING-GUIDE.md (obsolete pattern)
- ❌ generate-service.sh (service wrapper script)
- ❌ src/app/service/owner.service.ts (service wrapper)

### Cleanup #2 (2025-11-17) ✨ MAJOR CLEANUP
**Removed from root** (28 files):
- 7 duplicate files (already exist in docs/)
- 21 empty/placeholder files (< 10 bytes)

**Files organized**:
- ✅ Root now contains only README.md
- ✅ All documentation centralized in docs/ folder
- ✅ 16 well-organized documentation files in docs/

**Result**: Extremely clean structure with all docs properly organized in docs/ folder.

---

**Last Updated**: November 17, 2025
**Total Documentation Files**: 16
**Maintained**: Active
