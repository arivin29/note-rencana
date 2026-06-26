---
name: backend-module
description: Standard Goravel (Go) CRUD module for the iot-backend-go API — full layered stack Model + DTO + Repository + Service (RBAC) + Controller (BaseController) + routes, matching the shared camelCase response contract. Use when adding, porting, or editing any backend endpoint/module in iot-backend-go.
---

# Standard Backend Module (Goravel / Go)

Backend repo: `/Users/arivin29macmini/Documents/DEVETEK/iot-backend-go`. Goravel v1.17 (Gin + GORM), PostgreSQL, JWT. Layers: **Controller → Service → Repository → Model**, plus DTO and AppError. Preserve the inherited NestJS HTTP contract exactly (the Angular SDK depends on it).

## Files for a module `x`
```
app/models/x/x.go                       GORM struct + TableName()
app/dto/x/x_dto.go                      CreateXDTO, UpdateXDTO, XFilter
app/repositories/x/x_repository.go      data access (parameterized)
app/services/x/x_service.go             business logic + RBAC
app/http/controllers/x/x_controller.go  HTTP handlers (embed BaseController)
routes/api.go                           register CRUD under /api + JwtAuth
```

## Model
```go
type X struct {
    IDX     string  `gorm:"column:id_x;primaryKey;type:uuid;default:gen_random_uuid()" json:"idX"`
    IDOwner *string `gorm:"column:id_owner;type:uuid" json:"idOwner"`
    Name    string  `gorm:"column:name;type:varchar(255);not null" json:"name"`
    Status  string  `gorm:"column:status;type:text;default:'active'" json:"status"`
    models.BaseModel   // CreatedAt/UpdatedAt → json:"createdAt"/"updatedAt"
}
func (X) TableName() string { return "xs" }
```
Rules: UUID PK `gen_random_uuid()`; DB columns snake_case; **JSON tags camelCase (critical)**; nullable = pointer; arrays = `pq.StringArray` `type:text[]`; jsonb = `type:jsonb;serializer:json`; never `json:"-"` leak passwords.

## DTO
```go
type CreateXDTO struct { Name string `json:"name" validate:"required"`; IDOwner *string `json:"idOwner"` }
type UpdateXDTO struct { Name *string `json:"name"`; Status *string `json:"status"` }   // all optional/pointer
type XFilter   struct { IDOwner *string; Status *string; Search string; Page, Limit int }
```

## Repository
```go
type XRepository struct { connection string }
func NewXRepository() *XRepository { return &XRepository{connection: "postgres"} }
func (r *XRepository) DB() orm.Query { return facades.Orm().Connection(r.connection).Query() }

func (r *XRepository) FindByID(id string) (*xModel.X, error) {
    var x xModel.X; err := r.DB().Where("id_x = ?", id).First(&x); if err != nil { return nil, err }; return &x, nil }

func (r *XRepository) FindAllFiltered(p dto.PaginationRequest, f xDto.XFilter) ([]xModel.X, int64, error) {
    q := r.DB().Model(&xModel.X{})
    if f.IDOwner != nil && *f.IDOwner != "" { q = q.Where("id_owner = ?", *f.IDOwner) }
    if f.Status  != nil && *f.Status  != "" { q = q.Where("status = ?", *f.Status) }
    if p.Search != "" { s := "%" + sanitizeSearch(p.Search) + "%"; q = q.Where("name ILIKE ?", s) }
    total, err := q.Count(); if err != nil { return nil, 0, err }
    var rows []xModel.X
    err = q.Order("created_at DESC").Offset(p.Offset()).Limit(p.Limit).Get(&rows)
    return rows, total, err
}
func (r *XRepository) Create(x *xModel.X) error { return r.DB().Create(x) }
func (r *XRepository) Update(x *xModel.X) error { return r.DB().Save(x) }
func (r *XRepository) Delete(id string) error   { _, err := r.DB().Where("id_x = ?", id).Delete(&xModel.X{}); return err }
```
Always parameterize (`?`). Count before paginate. `sanitizeSearch` escapes `% _ \` before ILIKE.

## Service (RBAC lives here)
```go
type XService struct { services.BaseService; repo *xRepo.XRepository }
func NewXService() *XService { return &XService{repo: xRepo.NewXRepository()} }

func (s *XService) List(sc contracts.ServiceContext, f xDto.XFilter) ([]xModel.X, int64, error) {
    if services.IsTenant(sc) { f.IDOwner = &sc.OwnerID }      // tenant scoped to its owner
    p := dto.PaginationRequest{Page: f.Page, Limit: f.Limit, Search: f.Search}; p.Sanitize()
    return s.repo.FindAllFiltered(p, f)
}
func (s *XService) GetByID(sc contracts.ServiceContext, id string) (*xModel.X, error) {
    x, err := s.repo.FindByID(id); if err != nil { return nil, apperr.NotFound("X") }
    if services.IsTenant(sc) && x.IDOwner != nil && *x.IDOwner != sc.OwnerID { return nil, apperr.Forbidden("Access denied") }
    return x, nil
}
func (s *XService) Create(sc contracts.ServiceContext, in xDto.CreateXDTO) (*xModel.X, error) {
    x := &xModel.X{ Name: strings.TrimSpace(in.Name), IDOwner: in.IDOwner }
    if err := s.repo.Create(x); err != nil { facades.Log().Error("create x", "err", err); return nil, apperr.Internal("Failed to create X") }
    return x, nil
}
```
Services take `ServiceContext{UserID, OwnerID, Role}`, enforce admin/tenant rules, return `*AppError`, never touch HTTP.

## Controller (embed BaseController)
```go
type XController struct { controllers.BaseController; service *xService.XService }
func NewXController() *XController { return &XController{service: xService.NewXService()} }

func (c *XController) Index(ctx http.Context) http.Response {
    sc := c.serviceContext(ctx)
    f := xDto.XFilter{ Status: ptrIfNotEmpty(ctx.Request().Query("status", "")),
        Search: ctx.Request().Query("search", ""), Page: 1, Limit: 10 }
    // parse page/limit from query…
    rows, total, err := c.service.List(sc, f); if err != nil { return c.ErrorFromService(ctx, err) }
    return c.Paginated(ctx, rows, total, f.Page, f.Limit)
}
func (c *XController) Show(ctx http.Context) http.Response {
    x, err := c.service.GetByID(c.serviceContext(ctx), ctx.Request().Route("id"))
    if err != nil { return c.ErrorFromService(ctx, err) }; return c.Success(ctx, x) }
func (c *XController) Store(ctx http.Context) http.Response {
    var in xDto.CreateXDTO
    if err := ctx.Request().Bind(&in); err != nil { return c.Error(ctx, apperr.BadRequest("Invalid request body")) }
    if in.Name == "" { return c.Error(ctx, apperr.ValidationFailed([]string{"name should not be empty"})) }
    x, err := c.service.Create(c.serviceContext(ctx), in); if err != nil { return c.ErrorFromService(ctx, err) }
    return c.Created(ctx, x) }
```
Response helpers: `Paginated` → `{ data, meta }`; `Success`/`Created` return the entity **directly** (200/201); `Error`/`ErrorFromService` → `{ statusCode, message, error }`. Validate in the controller, collecting `[]string` for `ValidationFailed`.

## Routes
```go
xc := xCtrl.NewXController()
facades.Route().Prefix("/api").Middleware(middleware.JwtAuth()).Group(func(r route.Router) {
    r.Get("/xs", xc.Index); r.Post("/xs", xc.Store)
    r.Get("/xs/{id}", xc.Show); r.Patch("/xs/{id}", xc.Update); r.Delete("/xs/{id}", xc.Destroy)
})
```
Paths kebab-case, params `{id}`. Admin-only routes add `middleware.AdminOnly()`.

## Checklist
- [ ] Model with `TableName()`, UUID PK, camelCase JSON
- [ ] Create/Update/Filter DTOs (Update fields all pointers)
- [ ] Repository fully parameterized, count-before-paginate, sanitized search
- [ ] Service enforces tenant scoping + returns `*AppError`
- [ ] Controller embeds BaseController, uses Paginated/Success/Created/Error
- [ ] Routes registered with `JwtAuth()` (and `AdminOnly()` where needed)
- [ ] Path + JSON shape match the existing contract; `go build ./...` passes
