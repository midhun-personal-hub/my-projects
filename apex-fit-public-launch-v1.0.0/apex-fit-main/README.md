# Apex Fit — AI Fitness & Diet Tracker

**Release status: Public-launch candidate (v1.0.0)**

Production-oriented mobile-first PWA for fitness, nutrition, progress tracking and Gemini-powered coaching.

## Architecture

- React 19 + Vite + TypeScript
- Firebase Authentication (Google sign-in)
- Cloud Firestore with per-user isolation and field validation
- Express API for Gemini operations
- Firebase Admin SDK for server-side ID-token verification
- Configurable Gemini model with fallback models
- PWA service worker with safe runtime caching and no API caching
- Vercel-compatible serverless API entry point

## Security model

All AI API routes require a valid Firebase ID token:

- `POST /api/analyze-food-photo`
- `POST /api/extract-food-text`
- `POST /api/estimate-food`
- `POST /api/calculate-nutrition-goals`
- `POST /api/ai-chat`

The server verifies the token with Firebase Admin before the request reaches the AI service. There is also an IP rate limit and a per-user AI quota.

Firestore documents are stored below `/users/{uid}/...` and rules require `request.auth.uid == uid`. Important document fields are type/range validated in Firestore rules as well as in the client.

AI failures never silently create fake nutrition values. Food photo/text/estimate/coach failures return HTTP 503. Nutrition-goal calculation has a transparent deterministic calculator fallback and does not label the fallback as AI-generated.

## Environment variables

Copy `.env.example` to `.env` for local development.

Required client variables:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Required server variables:

- `GEMINI_API_KEY`
- `FIREBASE_PROJECT_ID`
- Firebase Admin credentials: either `FIREBASE_SERVICE_ACCOUNT_JSON`, or `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`.

Optional:

- `GEMINI_MODEL` (default `gemini-3.8-flash`)
- `GEMINI_FALLBACK_MODELS` (comma-separated)
- `AI_REQUESTS_PER_HOUR` (default `40`)
- `PORT` (default `3000`)

Never commit a service-account JSON file or any private key.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production build

```bash
npm run lint
npm run build
NODE_ENV=production npm start
```

The build creates the Vite frontend in `dist/` and bundles the canonical Node server to `server.js`.

## Vercel deployment

1. Import the repository into Vercel.
2. Use the Vite framework preset.
3. Build command: `vite build`
4. Output directory: `dist`
5. Add all required environment variables for Production and Preview.
6. For Firebase Admin authentication on Vercel, set `FIREBASE_SERVICE_ACCOUNT_JSON` to the service-account JSON as a Vercel secret. Do not put this JSON in the repository.
7. Add the Vercel deployment domain to Firebase Authentication → Settings → Authorized domains.
8. Deploy.

The serverless function is `api/index.ts`; it imports the same canonical `server/app.ts` used by local development, so local and Vercel API behavior does not diverge.

## Firebase

Deploy the included Firestore rules from the Firebase project using the Firebase CLI or Firebase Console. The rules intentionally deny all unspecified documents.

## Important production notes

- AI nutrition values are estimates and should be verified by the user before being treated as authoritative.
- The app does not store uploaded food photos on the server.
- AI request context is bounded and should contain only the minimum user data needed for the current question.
- The service worker never caches `/api/*` requests.

## Public launch checklist

Before switching the application to public production traffic:

1. Run `npm install` (or your supported package-manager install) and verify `npm run lint`.
2. Run `npm run build`.
3. Run `npm run test:production`.
4. Deploy Firestore rules with the Firebase CLI.
5. Configure Firebase Authentication → Authorized domains for the production domain.
6. Configure Vercel Production environment variables; never commit service-account credentials.
7. Test `/api/health` and verify every AI endpoint returns `401` without a Firebase token.
8. Sign in with a real account and complete the required adult profile setup.
9. Test food photo, text/voice extraction, manual food logging, workout logging, progress, and AI Coach on Android and desktop.
10. Verify AI failures, rate limits, Firestore access isolation, PWA installation/update, and account-data deletion procedures.

### Production safety changes in v1.0.0

- New accounts no longer persist fictional body measurements.
- Apex Fit is restricted to adults 18+ for the current nutrition model.
- Calorie estimation uses a deterministic Mifflin-St Jeor calculation and requires a selected sex option; it is presented as an estimate.
- AI Coach has explicit medical-risk guardrails and does not present itself as a medical professional.
- AI context is schema-limited instead of accepting arbitrary client data.
- Firestore rules validate profile sex/age and additional food fields.
- Public security headers are configured in `vercel.json`.
- Privacy, Terms, and Health & AI Safety pages are available under `/privacy.html`, `/terms.html`, and `/safety.html`.

### Verification limitation of this packaged artifact

The source and production configuration were statically checked in the packaging environment. A full dependency-backed `npm run lint` / `npm run build` could not be executed here because the environment did not have the project's npm dependencies installed and package installation timed out. Run those commands in CI or the deployment environment before public traffic is enabled.
