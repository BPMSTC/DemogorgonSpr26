import { DOCUMENT } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

// Shape of the data needed to kick off a Google Calendar export.
export interface GoogleCalendarExportRequest {
  performanceIds: string[];
  deviceUserId: string;
  timezone: string;
}

@Injectable({
  providedIn: 'root',
})
export class CalendarService {
  // The server endpoint that starts the Google Calendar OAuth flow.
  private readonly authBaseUrl = `${environment.apiUrl}${environment.calendarAuthEndpoint}`;

  constructor(@Inject(DOCUMENT) private document: Document) {}

  // Redirects the browser to the server's Google Calendar auth page, carrying the selected performances as query parameters.
  beginGoogleCalendarExport(request: GoogleCalendarExportRequest): void {
    // Pack the request fields into a URL query string.
    const query = new HttpParams({
      fromObject: {
        // Join multiple performance IDs into a single comma-separated value.
        performanceIds: request.performanceIds.join(','),
        // Include the user's device ID so the server can identify them after the OAuth redirect.
        deviceUserId: request.deviceUserId,
        // Pass the user's timezone so events are created in the correct local time.
        timezone: request.timezone,
      },
    });

    // Navigate the browser to the auth URL, which triggers the Google Calendar login flow.
    this.document.location.href = `${this.authBaseUrl}?${query.toString()}`;
  }
}
