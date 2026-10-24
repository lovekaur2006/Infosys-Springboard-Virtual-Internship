/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

declare global {
  interface Window {
    __APP_CONFIG__?: { googleClientId?: string };
  }
}

export interface CalendarUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export const IDENTITY_SCOPES = [
  'openid',
  'email',
  'profile',
];

export const CALENDAR_SCOPES = [
  // The app only reads and writes events on the user's primary calendar.
  'https://www.googleapis.com/auth/calendar.events.owned',
];

/** Turns Google OAuth failures into actionable, origin-specific guidance. */
export function getGoogleAuthErrorMessage(error: any): string {
  const code = error?.code || error?.type;
  if (code === 'auth/popup-blocked' || code === 'popup_failed_to_open') {
    return 'Google sign-in popup was blocked. Allow popups for this site, then try again.';
  }
  if (code === 'auth/popup-closed-by-user' || code === 'popup_closed') {
    return `Google sign-in popup closed unexpectedly. This usually means the origin "${window.location.origin}" is not listed under Authorized JavaScript origins in your Google Cloud OAuth client. Go to Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client ID, and add "${window.location.origin}" to Authorized JavaScript origins. Then reload and try again.`;
  }
  if (code === 'auth/access-denied' || code === 'access_denied' || code === 'invalid_request' || code === 'auth/invalid-request') {
    return `Google rejected the OAuth request from ${window.location.origin}. In the Google Cloud project that owns this OAuth client, add this exact origin (scheme, hostname, and port) under Google Auth Platform > Clients > Authorized JavaScript origins. For Calendar access, enable Google Calendar API and allow the https://www.googleapis.com/auth/calendar.events.owned scope in the OAuth consent setup. If the app is in Testing, add this Google account under Audience > Test users. A Workspace administrator may also block third-party OAuth apps. Reload after updating settings. Demo access remains available.`;
  }
  if (code === 'auth/unauthorized-domain') {
    return `This site (${window.location.hostname}) is not authorized by the identity provider. Add this origin to the Google OAuth client's Authorized JavaScript origins.`;
  }
  if (code === 'invalid_client' || code === 'unauthorized_client') {
    return 'Google rejected this OAuth client. Check that the configured client ID is a Web application client and that this site origin is listed in its Authorized JavaScript origins.';
  }
  return error?.message || 'Google Sign-In failed. Check the OAuth client and Calendar API configuration.';
}

const SESSION_USER_KEY = 'parleynet_google_user';
const SESSION_DEMO_KEY = 'parleynet_demo_session';
/** Persists that the user previously granted calendar scope — survives page reload. */
export const SESSION_CALENDAR_KEY = 'parleynet_calendar_granted';
let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt = 0;
let cachedIdentityToken: string | null = null;
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
              expires_in?: number;
              scope?: string;
              error?: string;
              error_description?: string;
            }) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
          hasGrantedAllScopes?: (tokenResponse: any, ...scopes: string[]) => boolean;
          hasGrantedAnyScope?: (tokenResponse: any, ...scopes: string[]) => boolean;
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
    const fail = (error: Error) => {
      finish();
      gisLoadPromise = null;
      reject(error);
    };
    const succeed = () => {
      finish();
      resolve();
    };
    timeoutId = setTimeout(
      () => fail(new Error('Timed out loading Google Identity Services. Check your network or content blocker.')),
      10_000
    );
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      const onLoad = () => {
        if (window.google?.accounts?.oauth2) succeed();
        else fail(new Error('Google Identity Services loaded but did not initialize'));
      };
      existing.addEventListener('load', onLoad, { once: true });
      existing.addEventListener('error', () => fail(new Error('Failed to load Google Identity Services. Check your network or content blocker.')), { once: true });
      if (window.google?.accounts?.oauth2) onLoad();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => succeed();
    script.onerror = () => {
      fail(new Error('Failed to load Google Identity Services. Check your network or content blocker.'));
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
  onAuthSuccess?: (user: CalendarUser, token: string | null, calendarGranted: boolean) => void,
  onAuthFailure?: () => void
) => {
  if (!cachedUser) {
    try {
      const storedUser = sessionStorage.getItem(SESSION_USER_KEY);
      if (storedUser) cachedUser = JSON.parse(storedUser) as CalendarUser;
      if (sessionStorage.getItem(SESSION_DEMO_KEY) === 'true') {
        cachedAccessToken = 'demo_token';
        cachedAccessTokenExpiresAt = Number.POSITIVE_INFINITY;
      }
    } catch {
      sessionStorage.removeItem(SESSION_USER_KEY);
      sessionStorage.removeItem(SESSION_DEMO_KEY);
      sessionStorage.removeItem(SESSION_CALENDAR_KEY);
    }
  }
  if (cachedUser) {
    // Calendar token is memory-only (security), but we track that consent was
    // previously granted so the UI shows Calendar as connected after a reload.
    const calendarGranted =
      sessionStorage.getItem(SESSION_CALENDAR_KEY) === 'true' ||
      sessionStorage.getItem(SESSION_DEMO_KEY) === 'true';
    onAuthSuccess?.(cachedUser, cachedAccessToken, calendarGranted);
  } else {
    onAuthFailure?.();
  }
  return () => {};
};

/**
 * Signs in using demo mode for local evaluation without external Google credentials.
 */
export const demoSignIn = (): { user: CalendarUser; accessToken: string; calendarGranted: boolean } => {
  const demoUser: CalendarUser = {
    displayName: 'Demo User (Internship Evaluation)',
    email: 'evaluator@infosys-springboard.org',
    photoURL: null,
  };
  cachedAccessToken = 'demo_token';
  cachedAccessTokenExpiresAt = Number.POSITIVE_INFINITY;
  cachedUser = demoUser;
  sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(demoUser));
  sessionStorage.setItem(SESSION_DEMO_KEY, 'true');
  sessionStorage.setItem(SESSION_CALENDAR_KEY, 'true');
  return { user: demoUser, accessToken: 'demo_token', calendarGranted: true };
};

/**
 * Signs in with Google Identity Services (Calendar scope).
 */
async function requestGoogleToken(
  scopes: string[]
): Promise<{ token: string; expiresIn: number; grantedScopes: string[]; calendarGranted: boolean } | null> {
  const envClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
  const configuredClientId = window.__APP_CONFIG__?.googleClientId || envClientId;
  const clientId = configuredClientId?.trim();
  if (!clientId || clientId.includes('REPLACE_WITH')) {
    throw new Error('Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID in .env.local or googleClientId in public/runtime-config.js, then add this site origin to the OAuth client.');
  }

  await loadGoogleIdentity();
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services failed to initialize');
  }

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: scopes.join(' '),
      callback: (response) => {
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

        const grantedScopes = (response.scope ? response.scope.split(' ') : []).filter(Boolean);
        const calendarGranted =
          CALENDAR_SCOPES.every((scope) => grantedScopes.includes(scope)) ||
          Boolean(window.google?.accounts?.oauth2?.hasGrantedAllScopes?.(response, ...CALENDAR_SCOPES));

        if (calendarGranted) {
          sessionStorage.setItem(SESSION_CALENDAR_KEY, 'true');
        } else {
          sessionStorage.removeItem(SESSION_CALENDAR_KEY);
        }

        resolve({
          token: response.access_token,
          expiresIn: response.expires_in || 3600,
          grantedScopes,
          calendarGranted,
        });
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
        reject(Object.assign(new Error(message), { code: err?.type === 'unknown' ? 'auth/access-denied' : undefined }));
      },
    });

    // GIS requests consent when a new scope needs it. Avoid forcing the consent
    // screen on every sign-in or Calendar refresh.
    client.requestAccessToken();
  });
}

/** Signs in and connects Google Calendar in the same consent flow. */
export const googleSignIn = async (): Promise<{ user: CalendarUser; accessToken: string; calendarGranted: boolean } | null> => {
  const result = await requestGoogleToken([...IDENTITY_SCOPES, ...CALENDAR_SCOPES]);
  if (!result) return null;
  cachedIdentityToken = result.token;
  cachedAccessToken = result.token;
  cachedAccessTokenExpiresAt = Date.now() + Math.max(0, result.expiresIn - 60) * 1000;
  try {
    cachedUser = await fetchGoogleProfile(result.token);
  } catch {
    cachedUser = { displayName: 'Google user', email: null, photoURL: null };
  }
  sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(cachedUser));
  sessionStorage.removeItem(SESSION_DEMO_KEY);
  return { user: cachedUser, accessToken: result.token, calendarGranted: result.calendarGranted };
};

/** Returns the short-lived Google identity token for server-side verification. */
export const getGoogleIdentityToken = (): string | null => cachedIdentityToken;

/** Requests calendar access only when the user opens or schedules a calendar event. */
export const googleCalendarSignIn = async (): Promise<{ user: CalendarUser; accessToken: string; calendarGranted: boolean } | null> => {
  if (cachedAccessToken && cachedAccessTokenExpiresAt > Date.now() + 60_000) {
    const calendarGranted = sessionStorage.getItem(SESSION_CALENDAR_KEY) === 'true';
    return {
      user: cachedUser || { displayName: null, email: null, photoURL: null },
      accessToken: cachedAccessToken,
      calendarGranted,
    };
  }
  const result = await requestGoogleToken(CALENDAR_SCOPES);
  if (!result) return null;
  cachedAccessToken = result.token;
  cachedAccessTokenExpiresAt = Date.now() + Math.max(0, result.expiresIn - 60) * 1000;
  if (!cachedUser) {
    try {
      cachedUser = await fetchGoogleProfile(result.token);
    } catch {
      cachedUser = { displayName: 'Google user', email: null, photoURL: null };
    }
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(cachedUser));
  }
  if (result.calendarGranted) {
    sessionStorage.setItem(SESSION_CALENDAR_KEY, 'true');
  }
  return { user: cachedUser, accessToken: result.token, calendarGranted: result.calendarGranted };
};

export const getAccessToken = async (): Promise<string | null> => cachedAccessToken;

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  cachedAccessTokenExpiresAt = token ? Date.now() + 3_500_000 : 0;
};

export const logout = async (): Promise<void> => {
  const tokens = [cachedAccessToken, cachedIdentityToken].filter((token): token is string => Boolean(token));
  cachedAccessToken = null;
  cachedAccessTokenExpiresAt = 0;
  cachedIdentityToken = null;
  cachedUser = null;
  sessionStorage.removeItem(SESSION_USER_KEY);
  sessionStorage.removeItem(SESSION_DEMO_KEY);
  sessionStorage.removeItem(SESSION_CALENDAR_KEY);
  if (tokens.length && window.google?.accounts?.oauth2) {
    await Promise.all(tokens.map((token) => new Promise<void>((resolve) => {
      try {
        window.google!.accounts.oauth2.revoke(token, () => resolve());
      } catch {
        resolve();
      }
      setTimeout(() => resolve(), 1500);
    })));
  }
};
