# Remove Production Mock Engine

## Status

PASS

## Problem

Production code previously mixed live Microsoft Graph API client calls and local mock sandbox logic inside the same class files (`GraphService`). The engine evaluated runtime states like checking if an MSAL account was active to dynamically fall back to fake responses, making it prone to running mock routines in production.

## Root Cause

Lack of a formal interface boundary decoupling production data operations from local dev mocking data scopes.

## Required Behavior

Separate mock and production implementations into discrete class files conforming to a standard `DataProvider` interface. Select the mock engine strictly based on a `VITE_ENABLE_MOCK_ENGINE === 'true'` environment variable, ensuring that production configurations resolve strictly to the live Graph provider and throw native API exceptions.

## Implementation

- Created `src/services/dataProvider.ts` defining the common standard `DataProvider` interface.
- Extracted mock sandbox data operations from the service layer to create `MockDataProvider` in `src/services/mockDataProvider.ts`.
- Rewrote `src/services/graphService.ts` to define `GraphDataProvider` containing purely direct Microsoft Graph HTTP fetch requests and mapping procedures.
- Modified the exported `graphService` instantiation at the bottom of `src/services/graphService.ts` to act as a factory resolver selecting `MockDataProvider` if `VITE_ENABLE_MOCK_ENGINE === 'true'`, and falling back to `GraphDataProvider` otherwise.

## Files Changed

- `src/services/dataProvider.ts` (NEW)
- `src/services/mockDataProvider.ts` (NEW)
- `src/services/graphService.ts`

## Architecture Changes

Introduced a data adapter boundary (`DataProvider` pattern) separating live Entra/SharePoint integrations from static client demo files.

## Security Impact

Eliminates the risk of the client application falling back to fake database states or returning mock payloads when network/auth requests fail in production.

## Performance Impact

None. Bundler treeshaking/transpilation maps requests cleanly to the chosen adapter.

## Verification

- [x] TypeScript/build check
- [ ] Relevant unit tests
- [ ] Relevant integration tests
- [x] Manual verification

## Verification Evidence

Build check outputs:
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
