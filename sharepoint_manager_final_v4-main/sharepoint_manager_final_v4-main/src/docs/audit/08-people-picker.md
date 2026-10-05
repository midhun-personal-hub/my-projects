# Audit Report 08 — PeoplePicker Microsoft Graph Runtime Architecture

**Status:** PASS  
**Audited Date:** August 10, 2026  
**Auditor:** Automated Remediation Engine  

---

## Executive Summary

The `PeoplePicker` component (`src/components/forms/PeoplePicker.tsx`) and underlying Graph data service layer (`src/services/graphService.ts`) have been fully audited, cleaned, and verified against Microsoft Entra ID / Microsoft Graph standards (`/v1.0/users`).

All legacy mock user constants (`MOCK_ENTRA_USERS`), hardcoded static directory arrays, and fake user fallbacks have been completely removed. Search requests execute exclusively against live Microsoft Graph APIs with 350ms input debouncing, returning a bounded result set (`$top=10`) and projecting only required identity attributes (`$select=id,displayName,userPrincipalName,mail`) to protect directory privacy.

---

## 1. Runtime Flow Verification

```
User types query in PeoplePicker
  ↓
350ms Debounce Buffer (`useDebounce`)
  ↓ (query.length >= 2)
Calls `graphService.searchUsers(query)`
  ↓
Microsoft Graph GET `/v1.0/users?$filter=startswith(displayName,'...') or startswith(mail,'...') or startswith(userPrincipalName,'...')&$select=id,displayName,userPrincipalName,mail&$top=10`
  ↓
Returns small result set (max 10 users)
  ↓
Renders results or error banner with [Retry Search] button
```

---

## 2. Component Capabilities & Edge Case Matrix

| Scenario / State | Implementation & UX Behavior | Status |
| :--- | :--- | :--- |
| **Search Debouncing** | 350ms debounce (`useDebounce`) prevents API throttling and request spamming | VERIFIED |
| **Small Result Set** | Constrained to `$top=10` via Graph OData query parameters | VERIFIED |
| **No Hardcoded/Fake Users** | `MOCK_ENTRA_USERS` completely removed; 0 fallback arrays | VERIFIED |
| **Directory Privacy** | Projects exclusively `$select=id,displayName,userPrincipalName,mail` | VERIFIED |
| **No Directory Dump** | Search requires at least 2 characters typed (`query.length >= 2`) | VERIFIED |
| **Loading State** | Displays animated `Loader2` spinner and "Searching Entra ID directory..." text | VERIFIED |
| **Empty State (<2 chars)** | Prompts user: "Type at least 2 characters to search Entra ID directory..." | VERIFIED |
| **Empty State (No match)** | Displays: "No matching Entra ID users found for '{query}'" | VERIFIED |
| **Error State & Retry** | Displays error banner with an explicit `[Retry Search]` button | VERIFIED |
| **Single Selection Mode** | Selects single `PersonUser` object, formats to OData structure, closes popover | VERIFIED |
| **Multi Selection Mode** | Renders selection chips with individual remove (`X`) buttons (`isMulti`) | VERIFIED |
| **Value Restoration** | `normalizeSelectedUsers(value)` restores existing string/object/array selections | VERIFIED |

---

## 3. Data Flow & Payload Contract

Selected user identities are formatted into the canonical SharePoint OData Person structure via `formatPersonPayload`:

```typescript
{
  id: "usr-guid-1234",
  displayName: "Alex Chen",
  email: "alex.chen@contoso.com",
  userPrincipalName: "alex.chen@contoso.com",
  Claims: "i:0#.f|membership|alex.chen@contoso.com"
}
```

---

## 4. Verification Checklist

- [x] Trace PeoplePicker → Graph runtime path end-to-end
- [x] Zero mock users or hardcoded fallbacks
- [x] Real Microsoft Graph search endpoint (`/v1.0/users`)
- [x] 350ms debounce buffer verified
- [x] Loading, empty, error, and retry states verified
- [x] Single and multi-selection modes verified
- [x] Value restoration on edit forms verified
- [x] TypeScript compilation (`compile_applet`) & Linter (`lint_applet`) verified green

---

**Audit Verdict:** PASS
