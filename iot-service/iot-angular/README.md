# IoT Angular Frontend

Angular frontend application for IoT Management System with auto-generated SDK from backend Swagger API.

---

## 📚 Documentation

**→ See [docs/DOC-INDEX.md](./docs/DOC-INDEX.md) for complete documentation guide**

### Quick Links:
- **[docs/TEAM-SDK-GUIDE.md](./docs/TEAM-SDK-GUIDE.md)** ⭐ - Main SDK integration guide
- **[docs/QUICK-REFERENCE.md](./docs/QUICK-REFERENCE.md)** 📋 - Cheat sheet for daily use
- **[docs/SDK-GENERATION-FAQ.md](./docs/SDK-GENERATION-FAQ.md)** ❓ - Troubleshooting

**All documentation**: [docs/](./docs/) folder

---

## 🚀 Quick Start

### Development Server
```bash
npm start
# Runs at: http://localhost:4200
```

### Generate/Update SDK
```bash
npm run generate-api
# Generates SDK from: http://localhost:3000/api-json
# Output to: src/sdk/core/
```

---

## 🎯 SDK Usage (Team Pattern)

### Import & Inject
```typescript
import { OwnersService } from '../../../sdk/core/services';
import { PaginatedResponseDto } from '../../../sdk/core/models';

constructor(private ownersService: OwnersService) { }
```

### Observable Pattern
```typescript
this.ownersService.ownersControllerFindAll({ page: 1, limit: 10 }).subscribe(
    (response: PaginatedResponseDto) => {
        this.loading = false;
        this.data = response.data;
    },
    (err: any) => {
        this.loading = false;
        this.error = err.message;
    }
);
```

**→ More examples in [docs/TEAM-SDK-GUIDE.md](./docs/TEAM-SDK-GUIDE.md)**

---

## 📁 Project Structure

```
src/
├── sdk/core/              # Auto-generated SDK (DO NOT EDIT)
│   ├── services/          # OwnersService, etc.
│   ├── models/            # DTOs & interfaces
│   └── api.module.ts      # SDK module
├── app/
│   ├── pages/             # Page components
│   ├── components/        # Shared components
│   ├── widget/            # Dashboard widgets
│   └── service/           # App services
└── environments/          # Config (apiUrl)
```

---

## 🛠️ Tech Stack

- **Angular**: 20.1.0
- **TypeScript**: 5.6.3
- **SDK Generator**: ng-openapi-gen 1.0.4
- **Backend**: NestJS @ http://localhost:3000

---

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start dev server (port 4200) |
| `npm run build` | Production build |
| `npm run generate-api` | Generate SDK from backend |
| `npm test` | Run unit tests |
| `npm run e2e` | Run e2e tests |

---

## 🔗 Backend Integration

- **Swagger JSON**: http://localhost:3000/api-json
- **Swagger UI**: http://localhost:3000/api
- **SDK Output**: `src/sdk/core/`
- **Example Component**: `src/app/pages/owner-test/owner-test.component.ts`

---

## 🎓 Learning Path

1. **New to project?** → Read [docs/DOC-INDEX.md](./docs/DOC-INDEX.md)
2. **Need SDK guide?** → Read [docs/TEAM-SDK-GUIDE.md](./docs/TEAM-SDK-GUIDE.md)
3. **Daily coding?** → Use [docs/QUICK-REFERENCE.md](./docs/QUICK-REFERENCE.md)
4. **Having issues?** → Check [docs/SDK-GENERATION-FAQ.md](./docs/SDK-GENERATION-FAQ.md)

---
ng-openapi-gen --input http://localhost:3000/api-json --output src/sdk/core

## 🔧 Configuration

### Generate SDK
Config file: `ng-openapi-gen.json`
```json
{
  "input": "http://localhost:3000/api-json",
  "output": "src/sdk/core"
}
```

### Environment
File: `src/environments/environment.ts`
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000'
};
```

### Module Setup
File: `src/app/app.module.ts`
```typescript
ApiModule.forRoot({ rootUrl: environment.apiUrl })
```

---

## ✅ SDK Integration Status

- ✅ SDK generated to `src/sdk/core/`
- ✅ ApiModule configured
- ✅ Observable pattern implemented
- ✅ Example component ready
- ✅ Documentation complete

**→ See [docs/SDK-SETUP-COMPLETE.md](./docs/SDK-SETUP-COMPLETE.md) for full status**

---

**Version**: 20.1.0  
**Last Updated**: November 11, 2024
