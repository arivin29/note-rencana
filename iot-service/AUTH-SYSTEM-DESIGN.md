# 🔐 Authentication & User Management System

## 📋 Table of Contents
- [Overview](#overview)
- [Database Schema](#database-schema)
- [Backend Architecture](#backend-architecture)
- [API Endpoints](#api-endpoints)
- [Authorization Rules](#authorization-rules)
- [Implementation Phases](#implementation-phases)

---

## 🎯 Overview

### Features
- ✅ User Authentication (Register, Login, Logout)
- ✅ JWT-based Authorization
- ✅ Role-Based Access Control (RBAC)
  - **Admin**: Full access to all resources
  - **Tenant**: Limited to owner-scoped resources
- ✅ Password Reset Flow
- ✅ User Management (CRUD)
- ✅ Session Management
- ✅ Audit Logging
- ✅ Dynamic Notifications System

### Technology Stack
- **Backend**: NestJS + TypeORM + PostgreSQL
- **Frontend**: Angular 18
- **Auth**: JWT (JSON Web Tokens)
- **Password**: bcrypt hashing

---

## 🗄️ Database Schema

### 1. Users Table
```sql
CREATE TABLE users (
  id_user UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_owner UUID REFERENCES owners(id_owner) ON DELETE SET NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'tenant' CHECK (role IN ('admin', 'tenant')),
  phone VARCHAR(50),
  avatar_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id_user),
  updated_by UUID REFERENCES users(id_user)
);

COMMENT ON TABLE users IS 'System users with authentication and authorization';
COMMENT ON COLUMN users.id_owner IS 'Link to owner - tenant users belong to an owner, admin users have NULL';
COMMENT ON COLUMN users.role IS 'User role: admin (full access) or tenant (owner-scoped access)';
COMMENT ON COLUMN users.is_active IS 'Account status - inactive users cannot login';

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_id_owner ON users(id_owner);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
```

### 2. Password Reset Tokens
```sql
CREATE TABLE password_reset_tokens (
  id_password_reset_token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user UUID NOT NULL REFERENCES users(id_user) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE password_reset_tokens IS 'Temporary tokens for password reset functionality';

CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_id_user ON password_reset_tokens(id_user);
```

### 3. User Sessions
```sql
CREATE TABLE user_sessions (
  id_user_session UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user UUID NOT NULL REFERENCES users(id_user) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  device_info JSONB,
  ip_address VARCHAR(45),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE user_sessions IS 'Active user sessions for security and session management';
COMMENT ON COLUMN user_sessions.token_hash IS 'Hashed JWT token for revocation capability';
COMMENT ON COLUMN user_sessions.device_info IS 'Browser, OS, device type extracted from user agent';

CREATE INDEX idx_user_sessions_id_user ON user_sessions(id_user);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
```

### 4. Audit Logs
```sql
CREATE TABLE audit_logs (
  id_audit_log UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user UUID REFERENCES users(id_user) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(50) DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system actions';
COMMENT ON COLUMN audit_logs.action IS 'Action performed: login, logout, create, update, delete, etc';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource: node, sensor, user, owner, etc';
COMMENT ON COLUMN audit_logs.changes IS 'JSON object containing before/after values';

CREATE INDEX idx_audit_logs_id_user ON audit_logs(id_user);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### 5. Notifications System
```sql
CREATE TYPE notification_channel_enum AS ENUM ('system', 'email', 'sms', 'push', 'webhook');

CREATE TABLE notification_channels (
  id_notification_channel UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_name notification_channel_enum NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE notification_channels IS 'Available notification delivery channels';
COMMENT ON COLUMN notification_channels.config IS 'Channel-specific configuration (SMTP, SMS gateway, etc)';

CREATE TABLE notifications (
  id_notification UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user UUID NOT NULL REFERENCES users(id_user) ON DELETE CASCADE,
  id_notification_channel UUID REFERENCES notification_channels(id_notification_channel),
  from_module VARCHAR(100) NOT NULL,
  from_module_id UUID,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivery_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'User notifications with dynamic source tracking';
COMMENT ON COLUMN notifications.from_module IS 'Source module: nodes, sensors, users, alerts, etc';
COMMENT ON COLUMN notifications.from_module_id IS 'ID of the source record that triggered notification';
COMMENT ON COLUMN notifications.type IS 'Notification type: alert, info, warning, error, system';
COMMENT ON COLUMN notifications.data IS 'Additional context data in JSON format';
COMMENT ON COLUMN notifications.delivery_status IS 'Status: pending, sent, failed, read';

CREATE INDEX idx_notifications_id_user ON notifications(id_user);
CREATE INDEX idx_notifications_from_module ON notifications(from_module);
CREATE INDEX idx_notifications_from_module_id ON notifications(from_module_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

### 6. Update Existing Tables
```sql
-- Add user tracking to existing tables
ALTER TABLE owners ADD COLUMN created_by UUID REFERENCES users(id_user);
ALTER TABLE owners ADD COLUMN updated_by UUID REFERENCES users(id_user);

ALTER TABLE projects ADD COLUMN created_by UUID REFERENCES users(id_user);
ALTER TABLE projects ADD COLUMN updated_by UUID REFERENCES users(id_user);

ALTER TABLE nodes ADD COLUMN created_by UUID REFERENCES users(id_user);
ALTER TABLE nodes ADD COLUMN updated_by UUID REFERENCES users(id_user);

ALTER TABLE sensors ADD COLUMN created_by UUID REFERENCES users(id_user);
ALTER TABLE sensors ADD COLUMN updated_by UUID REFERENCES users(id_user);

ALTER TABLE node_profiles ADD COLUMN created_by UUID REFERENCES users(id_user);
ALTER TABLE node_profiles ADD COLUMN updated_by UUID REFERENCES users(id_user);

-- Add indexes
CREATE INDEX idx_owners_created_by ON owners(created_by);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_nodes_created_by ON nodes(created_by);
CREATE INDEX idx_sensors_created_by ON sensors(created_by);
CREATE INDEX idx_node_profiles_created_by ON node_profiles(created_by);
```

---

## 🏗️ Backend Architecture

### Module Structure
```
iot-backend/src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── jwt.strategy.ts
│   ├── dto/
│   │   ├── register.dto.ts
│   │   ├── login.dto.ts
│   │   ├── forgot-password.dto.ts
│   │   └── reset-password.dto.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   └── decorators/
│       ├── roles.decorator.ts
│       ├── public.decorator.ts
│       └── current-user.decorator.ts
│
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   ├── update-user.dto.ts
│   │   ├── user-filter.dto.ts
│   │   └── change-password.dto.ts
│   └── entities/
│       └── user.entity.ts
│
├── notifications/
│   ├── notifications.module.ts
│   ├── notifications.controller.ts
│   ├── notifications.service.ts
│   ├── notifications.gateway.ts
│   ├── dto/
│   │   ├── create-notification.dto.ts
│   │   └── notification-filter.dto.ts
│   └── entities/
│       ├── notification.entity.ts
│       └── notification-channel.entity.ts
│
└── audit/
    ├── audit.module.ts
    ├── audit.service.ts
    ├── dto/
    │   └── create-audit-log.dto.ts
    └── entities/
        └── audit-log.entity.ts
```

---

## 🔌 API Endpoints

### Auth Endpoints
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login user |
| POST | `/api/auth/logout` | Private | Logout user |
| GET | `/api/auth/me` | Private | Get current user |
| POST | `/api/auth/forgot-password` | Public | Request password reset |
| POST | `/api/auth/reset-password` | Public | Reset password with token |
| POST | `/api/auth/refresh` | Private | Refresh access token |

### Users Endpoints
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/users` | Admin/Tenant | List users with filters |
| GET | `/api/users/:id` | Admin/Tenant | Get user details |
| POST | `/api/users` | Admin | Create new user |
| PATCH | `/api/users/:id` | Admin/Owner | Update user |
| DELETE | `/api/users/:id` | Admin | Delete user |
| PATCH | `/api/users/:id/change-password` | Admin/Owner | Change user password |
| PATCH | `/api/users/:id/activate` | Admin | Activate user |
| PATCH | `/api/users/:id/deactivate` | Admin | Deactivate user |
| GET | `/api/users/me/profile` | Private | Get my profile |
| PATCH | `/api/users/me/profile` | Private | Update my profile |

### Notifications Endpoints
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/notifications` | Private | List my notifications |
| GET | `/api/notifications/unread` | Private | Get unread count |
| PATCH | `/api/notifications/:id/read` | Private | Mark as read |
| DELETE | `/api/notifications/:id` | Private | Delete notification |
| PATCH | `/api/notifications/mark-all-read` | Private | Mark all as read |

### Audit Logs Endpoints
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/audit-logs` | Admin | List audit logs |
| GET | `/api/audit-logs/user/:userId` | Admin | User activity logs |

---

## 🔐 Authorization Rules

### Admin Role
- ✅ Full access to all resources
- ✅ Can manage all users
- ✅ Can view/edit all owners, projects, nodes, sensors
- ✅ Can access admin panel
- ✅ Can view audit logs
- ✅ `id_owner` is NULL

### Tenant Role
- ✅ Can only access own resources (where `created_by = id_user`)
- ✅ Can view/edit resources linked to their owner (`id_owner`)
- ❌ Cannot manage users
- ❌ Cannot access admin panel
- ❌ Cannot view audit logs
- ✅ `id_owner` must be set

### Resource Filtering Example
```typescript
// Service layer
async getNodes(user: User): Promise<Node[]> {
  if (user.role === 'admin') {
    // Admin sees all nodes
    return this.nodeRepository.find();
  } else {
    // Tenant sees only own nodes or nodes from their owner
    return this.nodeRepository.find({
      where: [
        { createdBy: user.idUser },
        { owner: { idOwner: user.idOwner } }
      ]
    });
  }
}
```

---

## 📅 Implementation Phases

### Phase 1: Database Setup ✅
**Duration**: 1 day

**Tasks**:
- [x] Create migration file for users table
- [x] Create migration for password_reset_tokens
- [x] Create migration for user_sessions
- [x] Create migration for audit_logs
- [x] Create migration for notifications tables
- [x] Create migration to update existing tables (add created_by/updated_by)
- [x] Run migrations and verify schema

**Deliverables**:
- Migration files in `iot-backend/migrations/`
- Database schema matches design

---

### Phase 2: Auth Module (Backend) 🔄
**Duration**: 2-3 days

**Tasks**:
- [ ] Create User entity with TypeORM
- [ ] Create PasswordResetToken entity
- [ ] Create UserSession entity
- [ ] Setup Auth module structure
- [ ] Implement JWT strategy with Passport
- [ ] Create auth DTOs (register, login, forgot-password, reset-password)
- [ ] Implement AuthService:
  - [ ] `register()` - Create new user with hashed password
  - [ ] `login()` - Validate credentials, generate JWT
  - [ ] `logout()` - Invalidate session
  - [ ] `validateUser()` - Check email/password
  - [ ] `forgotPassword()` - Generate reset token
  - [ ] `resetPassword()` - Validate token and update password
  - [ ] `refreshToken()` - Generate new access token
- [ ] Create AuthController with endpoints
- [ ] Create JWT Auth Guard
- [ ] Create Roles Guard
- [ ] Create decorators (@Public, @Roles, @CurrentUser)
- [ ] Add bcrypt password hashing
- [ ] Test all auth endpoints with Postman/Swagger

**Deliverables**:
- Working auth endpoints
- JWT token generation
- Password hashing
- Swagger documentation

---

### Phase 3: Users Module (Backend) 🔄
**Duration**: 2-3 days

**Tasks**:
- [ ] Create Users module structure
- [ ] Create user DTOs (create, update, filter, change-password)
- [ ] Implement UsersService:
  - [ ] `findAll()` - List with pagination & filters
  - [ ] `findOne()` - Get user by ID
  - [ ] `create()` - Create new user (admin only)
  - [ ] `update()` - Update user details
  - [ ] `remove()` - Soft delete user
  - [ ] `changePassword()` - Change user password
  - [ ] `activate()` - Activate user account
  - [ ] `deactivate()` - Deactivate user account
  - [ ] `getProfile()` - Get current user profile
  - [ ] `updateProfile()` - Update own profile
- [ ] Create UsersController with role-based guards
- [ ] Implement filtering logic (by role, owner, status)
- [ ] Add validation for email uniqueness
- [ ] Add validation for password strength
- [ ] Test all user endpoints

**Deliverables**:
- User CRUD endpoints
- Role-based filtering
- Profile management

---

### Phase 4: Audit Logging 🔄
**Duration**: 1 day

**Tasks**:
- [ ] Create AuditLog entity
- [ ] Create Audit module
- [ ] Implement AuditService:
  - [ ] `log()` - Create audit log entry
  - [ ] `findAll()` - List audit logs with filters
  - [ ] `findByUser()` - Get user activity logs
- [ ] Create audit interceptor to auto-log actions
- [ ] Add audit logging to:
  - [ ] Auth actions (login, logout, password reset)
  - [ ] User CRUD operations
  - [ ] Resource CRUD operations (nodes, sensors, etc)
- [ ] Create audit logs controller (admin only)
- [ ] Test audit logging

**Deliverables**:
- Audit logs for all critical actions
- Admin can view activity logs

---

### Phase 5: Notifications System 🔄
**Duration**: 2-3 days

**Tasks**:
- [ ] Create Notification entity
- [ ] Create NotificationChannel entity
- [ ] Create Notifications module
- [ ] Implement NotificationsService:
  - [ ] `create()` - Create notification
  - [ ] `findAll()` - List user notifications
  - [ ] `findUnread()` - Get unread notifications
  - [ ] `markAsRead()` - Mark notification as read
  - [ ] `markAllAsRead()` - Mark all as read
  - [ ] `delete()` - Delete notification
- [ ] Create NotificationsController
- [ ] Setup WebSocket gateway for real-time notifications
- [ ] Add notification triggers:
  - [ ] User created
  - [ ] Password changed
  - [ ] Node threshold alerts
  - [ ] System alerts
- [ ] Test notification flow

**Deliverables**:
- Notification CRUD endpoints
- Real-time notifications via WebSocket
- Notification triggers integrated

---

### Phase 6: Update Existing Modules 🔄
**Duration**: 2 days

**Tasks**:
- [ ] Update Owners module:
  - [ ] Add created_by/updated_by tracking
  - [ ] Add role-based filtering
  - [ ] Add audit logging
- [ ] Update Projects module:
  - [ ] Add created_by/updated_by tracking
  - [ ] Add role-based filtering
  - [ ] Add audit logging
- [ ] Update Nodes module:
  - [ ] Add created_by/updated_by tracking
  - [ ] Add role-based filtering
  - [ ] Add audit logging
  - [ ] Add notification triggers
- [ ] Update Sensors module:
  - [ ] Add created_by/updated_by tracking
  - [ ] Add role-based filtering
  - [ ] Add audit logging
- [ ] Update Node Profiles module:
  - [ ] Add created_by/updated_by tracking
  - [ ] Add role-based filtering
  - [ ] Add audit logging
- [ ] Test role-based access across all modules

**Deliverables**:
- All modules track user actions
- All modules respect role-based access
- All modules log audit trails

---

### Phase 7: Frontend Auth Module 🔄
**Duration**: 3-4 days

**Tasks**:
- [ ] Create auth module structure
- [ ] Copy & adapt login template
- [ ] Copy & adapt register template
- [ ] Create forgot-password component
- [ ] Create reset-password component
- [ ] Create AuthService:
  - [ ] `login()` - Call login API
  - [ ] `register()` - Call register API
  - [ ] `logout()` - Clear session
  - [ ] `getCurrentUser()` - Get user from token
  - [ ] `forgotPassword()` - Request reset
  - [ ] `resetPassword()` - Reset with token
  - [ ] `isAuthenticated()` - Check login status
  - [ ] `hasRole()` - Check user role
- [ ] Create TokenService:
  - [ ] `getToken()` - Get JWT from storage
  - [ ] `setToken()` - Save JWT to storage
  - [ ] `removeToken()` - Clear JWT
  - [ ] `decodeToken()` - Parse JWT payload
- [ ] Create AuthGuard (route protection)
- [ ] Create RoleGuard (role-based access)
- [ ] Create AuthInterceptor (add Bearer token)
- [ ] Update app routing with guards
- [ ] Test login/logout flow

**Deliverables**:
- Working login/register pages
- Route protection
- JWT management

---

### Phase 8: Frontend User Management 🔄
**Duration**: 3-4 days

**Tasks**:
- [ ] Create admin module structure
- [ ] Create users-list component:
  - [ ] Display users table
  - [ ] Add search/filter/pagination
  - [ ] Add action buttons (edit, delete, activate)
- [ ] Create user-detail component:
  - [ ] Display user info
  - [ ] Edit user form
  - [ ] Change password form
- [ ] Create user-create component:
  - [ ] Create user form
  - [ ] Role selection
  - [ ] Owner selection (for tenants)
- [ ] Create UsersService (frontend):
  - [ ] `getUsers()` - List with filters
  - [ ] `getUser()` - Get by ID
  - [ ] `createUser()` - Create new
  - [ ] `updateUser()` - Update existing
  - [ ] `deleteUser()` - Delete user
  - [ ] `changePassword()` - Change password
  - [ ] `activateUser()` - Activate
  - [ ] `deactivateUser()` - Deactivate
- [ ] Add user management to admin menu
- [ ] Test all user operations

**Deliverables**:
- User management interface
- Create/edit/delete users
- Activate/deactivate users

---

### Phase 9: Frontend Notifications 🔄
**Duration**: 2-3 days

**Tasks**:
- [ ] Create notifications service (frontend)
- [ ] Create notification bell widget
- [ ] Create notifications dropdown
- [ ] Create notifications page
- [ ] Setup WebSocket connection
- [ ] Handle real-time notifications
- [ ] Add notification badge counter
- [ ] Add mark as read functionality
- [ ] Add delete functionality
- [ ] Add toast/snackbar for new notifications
- [ ] Test notification flow

**Deliverables**:
- Notification bell in header
- Real-time notification updates
- Notifications list page

---

### Phase 10: Testing & Documentation 🔄
**Duration**: 2 days

**Tasks**:
- [ ] Write unit tests for auth service
- [ ] Write unit tests for users service
- [ ] Write e2e tests for auth flow
- [ ] Write e2e tests for user management
- [ ] Test role-based access
- [ ] Test password reset flow
- [ ] Test notification triggers
- [ ] Update API documentation
- [ ] Create user guide
- [ ] Create admin guide
- [ ] Final QA testing

**Deliverables**:
- Test coverage > 80%
- Complete documentation
- Production-ready system

---

## 📊 Progress Tracking

### Summary
- **Total Phases**: 10
- **Estimated Duration**: 3-4 weeks
- **Current Phase**: Phase 1 (Database Setup)
- **Status**: 🔄 In Progress

### Milestones
- [ ] **Milestone 1**: Database & Backend Auth (Phase 1-2) - Week 1
- [ ] **Milestone 2**: User Management & Audit (Phase 3-4) - Week 2
- [ ] **Milestone 3**: Notifications & Integration (Phase 5-6) - Week 3
- [ ] **Milestone 4**: Frontend Complete (Phase 7-9) - Week 4
- [ ] **Milestone 5**: Testing & Launch (Phase 10) - End of Week 4

---

## 🔗 Related Documents
- [API Documentation](./docs/API-DOCUMENTATION.md)
- [Database Schema](./docs/DATABASE-SCHEMA.md)
- [User Guide](./docs/USER-GUIDE.md)
- [Admin Guide](./docs/ADMIN-GUIDE.md)

---

**Last Updated**: November 29, 2025  
**Version**: 1.0.0  
**Status**: ✅ Design Complete - Ready for Implementation
