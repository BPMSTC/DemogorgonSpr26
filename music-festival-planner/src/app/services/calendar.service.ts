import { DOCUMENT } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface GoogleCalendarExportRequest {
  performanceIds: string[];
  deviceUserId: string;
  timezone: string;
}

@Injectable({
  providedIn: 'root',
})
export class CalendarService {
  private readonly authBaseUrl = `${environment.apiUrl}${environment.calendarAuthEndpoint}`;

  constructor(@Inject(DOCUMENT) private document: Document) {}

  beginGoogleCalendarExport(request: GoogleCalendarExportRequest): void {
    const query = new HttpParams({
      fromObject: {
        performanceIds: request.performanceIds.join(','),
        deviceUserId: request.deviceUserId,
        timezone: request.timezone,
      },
    });

    this.document.location.href = `${this.authBaseUrl}?${query.toString()}`;
  }
}