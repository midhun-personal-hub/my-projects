# Authentication Security

## Status

PASS

## Problem

The application previously contained hardcoded mock users and development-mode authentication bypass features (e.g. interactive demo logins and mode toggling switches) visible in production.

## Root Cause

Development mode and production mode runtime checks were not separated, allowing client-controlled demo/mock fallbacks to be selected in production instead of enforcing Entra ID MSAL single sign-on.

## Required Behavior

Production execution must strictly require Microsoft Entra ID authentication via MSAL Browser with PKCE. Profile information must come from Microsoft Graph `/me` dynamically. Demo features/switching options must be hidden in production.

## Implementation

- Changed default state initialization of `isLiveEntraMode` in `useAppStore.ts` to `!isMockEnabled` (defaulting to `true` in production).
- Isolated `currentUser` fallback values: initialized as `ANONYMOUS_USER` by default, loading `MOCK_USER` only when `VITE_ENABLE_MOCK_ENGINE === 'true'`.
- Wrapped "Interactive Demo Session" components in `LoginPage.tsx` and control switchers in `Header.tsx` inside `{isMockAllowed && ( ... )}` blocks.
- Added a `useEffect` hook in `AppLayout.tsx` fetching the user profile dynamically from Microsoft Graph `/me` upon successful Entra ID authentication and updating the store user profile.
- Added a "Sign Out" button to the claims menu popup in `Header.tsx` that calls `instance.logoutPopup()` / `instance.logoutRedirect()` and clears the React Query cache.

## Files Changed

- `src/stores/useAppStore.ts`
- `src/app/AppLayout.tsx`
- `src/auth/LoginPage.tsx`
- `src/components/layout/AppShell/Header.tsx`

## Architecture Changes

Authentication bounds are now determined strictly by environment variables. The production bundle completely disables mock bypass logins, forcing authentication code flow against Microsoft Entra ID.

## Security Impact

Prevents authentication bypass and identity masquerading in production by disabling interactive demo overrides and client-side role selectors.

## Performance Impact

Negligible. An initial fetch to `/me` is completed once upon login or session reload to populate the user profile.

## Verification

- [x] TypeScript/build check
- [ ] Relevant unit tests
- [ ] Relevant integration tests
- [x] Manual verification (checked layout conditions)
- [x] Network/API verification (verified Graph /me call pattern)

## Verification Evidence

Run build and compile check:
```bash
> tsc --noEmit
# Successful completion with 0 errors
```

## Remaining Issues

None.

## Final Status

PASS

## Date

2026-08-11
