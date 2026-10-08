/**
 * Server-side Firebase Authentication.
 *
 * In Google-hosted environments the Admin SDK can use Application Default
 * Credentials. For Vercel/non-Google hosts, provide FIREBASE_SERVICE_ACCOUNT_JSON
 * (or the individual FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY variables).
 */
import { cert, getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { Request, Response, NextFunction } from 'express';

function getProjectId() {
  return process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
}

function getCredential() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    try {
      const parsed = JSON.parse(json);
      return cert({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: String(parsed.private_key || '').replace(/\\n/g, '\n'),
      });
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
    }
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (clientEmail && privateKey) {
    return cert({
      projectId: getProjectId(),
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    });
  }

  return applicationDefault();
}

function ensureFirebaseAdmin() {
  if (getApps().length > 0) return;

  const projectId = getProjectId();
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is not configured');
  }

  initializeApp({
    credential: getCredential(),
    projectId,
  });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    ensureFirebaseAdmin();

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decodedToken = await getAuth().verifyIdToken(token);
    res.locals.uid = decodedToken.uid;
    return next();
  } catch (error) {
    console.error('Firebase auth verification failed:', error instanceof Error ? error.message : error);
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
}
