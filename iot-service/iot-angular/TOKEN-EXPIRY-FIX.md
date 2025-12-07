# Token Expiry Auto-Logout Fix

## Problem
When JWT token expires (401 Unauthorized), the application shows "Loading users..." spinner indefinitely instead of redirecting to login page.

## Root Cause
The JWT Interceptor was not properly handling token refresh failures. When refresh token also expired, it only threw an error without clearing session or redirecting to login.

## Solution

### 1. JWT Interceptor (`jwt.interceptor.ts`)
**Changes:**
- Added check to prevent refresh loop on `/auth/` endpoints
- When token refresh fails, explicitly call `authService.logout()` to clear session and redirect
- This ensures immediate logout and redirect when both access and refresh tokens are expired

```typescript
// Before: Only threw error
catchError((err) => {
  this.isRefreshing = false;
  return throwError(() => err);
})

// After: Logout and redirect
catchError((err) => {
  this.isRefreshing = false;
  this.authService.logout(); // Clear session and redirect to login
  return throwError(() => err);
})
```

### 2. Auth Service (`auth.service.ts`)
**Changes:**
- Modified `logout()` to clear session FIRST before making API call
- Navigate to login immediately (don't wait for backend response)
- Backend logout call is now "fire and forget" to prevent delays

```typescript
// Before: Wait for API response
this.http.post(`${this.API_URL}/logout`, {}).subscribe({
  next: () => {
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }
});

// After: Clear session immediately
this.clearSession();
this.router.navigate(['/auth/login']);
this.http.post(`${this.API_URL}/logout`, {}).subscribe(); // Fire and forget
```

## Flow Diagram

### Before Fix:
```
Token Expired (401) 
  → Try Refresh Token
    → Refresh Failed (401)
      → Throw Error
        → Component stuck in loading state ❌
```

### After Fix:
```
Token Expired (401) 
  → Try Refresh Token
    → Refresh Failed (401)
      → Call logout()
        → Clear localStorage
        → Update observables (isAuthenticated$ = false)
        → Navigate to /auth/login ✅
```

## Testing Checklist

1. **Normal Token Refresh (Works)**
   - [ ] Access token expires
   - [ ] Request automatically refreshes token
   - [ ] Original request retries with new token
   - [ ] User sees no interruption

2. **Expired Refresh Token (Fixed)**
   - [ ] Both tokens expired
   - [ ] App immediately redirects to login
   - [ ] localStorage cleared
   - [ ] No infinite spinner
   - [ ] No console errors

3. **Manual Logout (Works)**
   - [ ] User clicks logout button
   - [ ] Immediately redirected to login
   - [ ] localStorage cleared

4. **Protected Routes**
   - [ ] Cannot access protected routes without token
   - [ ] Auth guard redirects to login
   - [ ] Return URL preserved in query params

## Files Modified

1. `/src/app/services/jwt.interceptor.ts`
   - Added check for `/auth/` endpoints
   - Added explicit logout on refresh failure

2. `/src/app/services/auth.service.ts`
   - Modified logout() to clear session immediately
   - Backend logout call is now async (fire and forget)

## Backend Requirements

Ensure backend `/api/auth/refresh` endpoint:
- Returns 401 when refresh token is expired/invalid
- Does NOT return 500 or other status codes for expired tokens

## Security Notes

- Access tokens should have short expiry (5-15 minutes)
- Refresh tokens should have longer expiry (7-30 days)
- Both tokens cleared from localStorage on logout
- No sensitive data stored in localStorage besides tokens
- Tokens validated on every API request via interceptor

## Related Files

- `src/app/services/auth.guard.ts` - Route protection
- `src/app/services/guest.guard.ts` - Redirect authenticated users
- `src/app/models/auth.model.ts` - Auth DTOs
- `src/app/pages/auth/login/login.ts` - Login component

## Next Steps (Optional Enhancements)

1. **Session Timeout Warning**
   - Show modal 1 minute before token expires
   - Allow user to extend session

2. **Auto Refresh Background**
   - Proactively refresh token before it expires
   - Prevents mid-request 401 errors

3. **Remember Me Feature**
   - Optional longer refresh token expiry
   - Stored in secure httpOnly cookie

4. **Multiple Tab Sync**
   - Use BroadcastChannel or localStorage events
   - Logout all tabs when one logs out
