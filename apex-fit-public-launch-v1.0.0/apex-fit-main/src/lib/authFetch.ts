/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { auth } from '../firebase/config';

export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
