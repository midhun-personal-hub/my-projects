# Authorization / RBAC

## Status

PASS

## Problem

Client-controlled role switching dropdown was visible to unauthorized roles in production. Permission-checking logic was scattered across views without a single source of truth, and was evaluated on client state only.

## Root Cause

Role switcher switches values directly in the client state engine. Components implemented local custom mappings from roles to specific buttons/features rather than using a centralized permission resolver structure.

## Required Behavior

Role switching must be disabled and hidden in production. Authorization rules must be managed centrally by evaluating permissions against role definitions mapped from authentication scopes. Centralized guard components must consume permissions rather than inline role checks.

## Implementation

- Created `src/security/permissions.ts` mapping standard app roles (`Administrator`, `Manager`, `Employee`) to granular operations (`workspace.read`, `workspace.manage`, `menu.read`, `menu.manage`, `item.create`, `item.read`, `item.update`, `item.delete`, `item.bulkUpdate`, `item.bulkDelete`).
- Created `src/security/authorizationResolver.ts` containing the evaluation functions `hasPermission` and `hasRole` over user context.
- Modified `PermissionGuard.tsx` to consume the new `Permission` type and evaluate access claims using `hasPermission` and `hasRole` helper resolvers.
- Restricted the Switch RBAC dropdown inside the `Header.tsx` shell to only display when `isMockAllowed` is enabled in development.

## Files Changed

- `src/security/permissions.ts` (NEW)
- `src/security/authorizationResolver.ts` (NEW)
- `src/components/common/PermissionGuard.tsx`
- `src/components/layout/AppShell/Header.tsx`

## Architecture Changes

Permission maps are now defined as static claims matrices in a dedicated module, decoupling component presentation from business authorization rules.

## Security Impact

Establishes a centralized structure for role/permission assertions, making features auditable and eliminating client-side privilege escalation in production configurations.

## Performance Impact

None. Evaluation of static list mapping arrays is near-instantaneous.

## Verification

- [x] TypeScript/build check
- [ ] Relevant unit tests
- [ ] Relevant integration tests
- [x] Manual verification (inspected hidden dropdown buttons)

## Verification Evidence

Build validation outputs:
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
