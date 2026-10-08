# Express Rate Limit Proxy Fix Plan

Fix the Express rate-limiter proxy validation errors in `server.ts` caused by `X-Forwarded-For` headers sent by reverse proxy environments (e.g. Google Cloud Run, Vercel).

---

## 1. Issue Analysis

- **`ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`**: Express defaults `trust proxy` to `false`, causing `express-rate-limit` to raise a validation warning when receiving `X-Forwarded-For` from reverse proxies.
- **`ERR_ERL_FORWARDED_HEADER`**: `express-rate-limit` raises a validation notice regarding the `Forwarded` header when `trust proxy` is unconfigured.

---

## 2. Solution Strategy

1. **Configure Express Proxy Trust**:
   - Add `app.set('trust proxy', 1);` immediately after creating the Express app instance in `server.ts`.
2. **Configure Rate Limit Options**:
   - Set `validate: { xForwardedForHeader: false }` or appropriate validation settings on `rateLimit` middleware.

---

## Technical Architecture

```
Client / Proxy (X-Forwarded-For) ──► Express (app.set('trust proxy', 1)) ──► rateLimit Middleware (IP correctly parsed)
```

---

## Implementation Steps

1. Update `server.ts` to add `app.set('trust proxy', 1);` and update `rateLimit` options.
2. Run `compile_applet` and `lint_applet` to verify compilation.
