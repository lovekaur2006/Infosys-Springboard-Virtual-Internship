/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CalendarEventPayload {
  summary: string;
  description: string;
  startDateTime: string; // ISO string
  endDateTime: string;   // ISO string
  attendees?: { email: string }[];
  location?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  htmlLink: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
}

/**
 * Creates an event on the user's primary Google Calendar.
 * (Called only after explicit confirmation in UI)
 */
export async function createCalendarEvent(
  accessToken: string,
  event: CalendarEventPayload
): Promise<GoogleCalendarEvent> {
  // Support Demo Mode (offline / evaluation mode)
  if (accessToken === 'demo_token') {
    const demoEvent: GoogleCalendarEvent = {
      id: `demo-${Date.now()}`,
      summary: event.summary,
      description: event.description,
      htmlLink: 'https://calendar.google.com',
      start: { dateTime: event.startDateTime },
      end: { dateTime: event.endDateTime },
    };
    try {
      const stored = JSON.parse(localStorage.getItem('negotiateai_demo_events') || '[]');
      stored.unshift(demoEvent);
      localStorage.setItem('negotiateai_demo_events', JSON.stringify(stored));
    } catch (e) {
      console.warn('Could not persist demo event to localStorage', e);
    }
    return demoEvent;
  }

  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

  const body = {
    summary: event.summary,
    description: event.description,
    location: event.location || 'NegotiateAI Virtual Room',
    start: {
      dateTime: event.startDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: event.endDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    attendees: event.attendees || [],
    reminders: {
      useDefault: true,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google Calendar API error (${response.status}): ${errorBody}`);
  }

  return await response.json();
}

/**
 * Lists recent and upcoming negotiation events from the user's primary Google Calendar.
 */
export async function listCalendarEvents(accessToken: string): Promise<GoogleCalendarEvent[]> {
  // Support Demo Mode
  if (accessToken === 'demo_token') {
    try {
      return JSON.parse(localStorage.getItem('negotiateai_demo_events') || '[]');
    } catch {
      return [];
    }
  }

  const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    timeMin
  )}&maxResults=25&orderBy=startTime&singleEvents=true&q=NegotiateAI`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fetch events (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.items || [];
}
