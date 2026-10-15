/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import firebaseConfig from '../../firebase-applet-config.json';

export interface CalendarUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export const CALENDAR_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.events',
];

/** Turns Google OAuth failures into actionable, origin-specific guidance. */
export function getGoogleAuthErrorMessage(error: any): string {
  const code = error?.code || error?.type;
  if (code === 'auth/popup-blocked' || code === 'popup_failed_to_open') {
    return 'Google sign-in popup was blocked. Allow popups for this site, then try again.';
  }
  if (code === 'auth/popup-closed-by-user' || code === 'popup_closed') {
    return 'Google sign-in was cancelled before Calendar access was granted.';
  }
  if (code === 'auth/access-denied' || code === 'access_denied') {
    return `Google blocked Calendar authorization for ${window.location.origin}. Check Google Cloud Console: enable the Google Calendar API, add this exact origin under OAuth client Authorized JavaScript origins, and add your account as a test user if the consent screen is in Testing. Google may also require Workspace admin approval.`;
  }
  if (code === 'auth/unauthorized-domain') {
    return `This site (${window.location.hostname}) is not authorized by the identity provider. Add the domain to the OAuth client and, if Firebase Auth is used, Firebase Authorized domains.`;
  }
  return error?.message || 'Google Sign-In failed. Check the OAuth client and Calendar API configuration.';
}

let cachedAccessToken: string | null = null;
let cachedUser: CalendarUser | null = null;
let gisLoadPromise: Promise<void> | null = null;

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (resp: {
              access_token?: string;
              error?: string;
              error_description?: string;
            }) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

function redirectLanIpToLocalhost(): boolean {
  const { hostname, port, protocol, pathname, search, hash } = window.location;
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
  if (!isIp) return false;
  const next = `${protocol}//localhost${port ? `:${port}` : ''}${pathname}${search}${hash}`;
  window.location.replace(next);
  return true;
}

function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      const onLoad = () => {
        if (window.google?.accounts?.oauth2) resolve();
        else reject(new Error('Google Identity Services loaded but did not initialize'));
      };
      existing.addEventListener('load', onLoad, { once: true });
      existing.addEventListener('error', () => {
        gisLoadPromise = null;
        reject(new Error('Failed to load Google Identity Services'));
      }, { once: true });
      // A previously loaded script will not emit another load event.
      if (window.google?.accounts?.oauth2) onLoad();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisLoadPromise = null;
      reject(new Error('Failed to load Google Identity Services'));
    };
    document.head.appendChild(script);
  });

  return gisLoadPromise;
}

async function fetchGoogleProfile(accessToken: string): Promise<CalendarUser> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    return { displayName: 'Google user', email: null, photoURL: null };
  }
  const profile = await response.json();
  return {
    displayName: profile.name || null,
    email: profile.email || null,
    photoURL: profile.picture || null,
  };
}

/**
 * Initializes auth restoration. Calendar tokens stay in memory only.
 */
export const initAuth = (
  onAuthSuccess?: (user: CalendarUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (cachedUser && cachedAccessToken) {
    onAuthSuccess?.(cachedUser, cachedAccessToken);
  } else {
    onAuthFailure?.();
  }
  return () => {};
};

/**
 * Signs in using demo mode for local evaluation without external Google credentials.
 */
export const demoSignIn = (): { user: CalendarUser; accessToken: string } => {
  const demoUser: CalendarUser = {
    displayName: 'Demo User (Internship Evaluation)',
    email: 'evaluator@infosys-springboard.org',
    photoURL: null,
  };
  cachedAccessToken = 'demo_token';
  cachedUser = demoUser;
  return { user: demoUser, accessToken: 'demo_token' };
};

/**
 * Signs in with Google Identity Services (Calendar scope) without Firebase Auth domains.
 */
export const googleSignIn = async (): Promise<{
  user: CalendarUser;
  accessToken: string;
} | null> => {
  if (redirectLanIpToLocalhost()) {
    return null;
  }

  const envClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
  const clientId = (envClientId && envClientId.trim().length > 0) ? envClientId : firebaseConfig.oAuthClientId;
  if (!clientId) {
    throw new Error('Missing Google OAuth client ID in firebase-applet-config.json or .env.local');
  }

  await loadGoogleIdentity();
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services failed to initialize');
  }

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: CALENDAR_SCOPES.join(' '),
      callback: async (response) => {
        if (response.error || !response.access_token) {
          const errorMsg =
            response.error_description ||
            response.error ||
            'Google sign-in was cancelled or failed';

          // Google returns access_denied for several console-side OAuth blocks.
          if (response.error === 'access_denied') {
            reject(
              Object.assign(new Error(errorMsg), { code: 'auth/access-denied' })
            );
            return;
          }

          reject(new Error(errorMsg));
          return;
        }

        cachedAccessToken = response.access_token;
        cachedUser = await fetchGoogleProfile(response.access_token);
        resolve({ user: cachedUser, accessToken: cachedAccessToken });
      },
      error_callback: (err) => {
        const message = err?.message || err?.type || 'Google sign-in failed';
        if (err?.type === 'popup_closed') {
          reject(Object.assign(new Error(message), { code: 'auth/popup-closed-by-user' }));
          return;
        }
        if (err?.type === 'popup_failed_to_open') {
          reject(Object.assign(new Error(message), { code: 'auth/popup-blocked' }));
          return;
        }
        reject(new Error(message));
      },
    });

    client.requestAccessToken({ prompt: 'consent' });
  });
};

export const getAccessToken = async (): Promise<string | null> => cachedAccessToken;

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async (): Promise<void> => {
  const token = cachedAccessToken;
  cachedAccessToken = null;
  cachedUser = null;
  if (token && window.google?.accounts?.oauth2) {
    await new Promise<void>((resolve) => {
      window.google!.accounts.oauth2.revoke(token, () => resolve());
      setTimeout(() => resolve(), 1500);
    });
  }
};
