import {
  Component,
  Inject,
  Injector,
  OnInit,
  OnDestroy,
  effect,
  ChangeDetectorRef,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ScheduleService } from '../services/schedule.service';
import { FestivalService } from '../services/festival.service';
import { PersonalScheduleService, PersonalConflict } from '../services/personal-schedule.service';
import { Performance } from '../models/performance.model';
import { CalendarService } from '../services/calendar.service';
import { LOCAL_STORAGE } from '../services/schedule.service';
import { environment } from '../environments/environment';

// ---- Filter Sentinels ------------------------------------------------------

// Sentinel string used when the user has not filtered by a specific stage.
export const ALL_STAGES = 'All Stages';
// Sentinel string used when the user has not filtered by a specific genre.
export const ALL_GENRES = 'All Genres';

// ---- Types -----------------------------------------------------------------

// Describes an overlapping time slot found between two performances on the same stage.
export interface ConflictInfo {
  time: string;
  stage: string;
  artists: string[];
  ids: string[];
}

// The two tabs the user can switch between on the schedule page.
export type ActiveView = 'festival' | 'personal';

// ---- Component -------------------------------------------------------------

// Display both the full festival schedule and the user's personal saved performances.
@Component({
  selector: 'app-my-schedule',
  standalone: false,
  templateUrl: '../../pages/my-schedule.html',
  styleUrl: '../../css/my-schedule.css',
})
export class MySchedule implements OnInit, OnDestroy {
  // Which tab the user is currently viewing — festival grid or personal list.
  activeView: ActiveView = 'festival';
  // Whether the mobile filter panel is expanded or collapsed.
  mobileFiltersExpanded = false;

  // The id of the festival being viewed (empty when showing the global personal schedule).
  festivalId: string = '';
  // The display name of the festival, shown in the page heading.
  festivalName: string = '';
  // All performances fetched for the current festival.
  allPerformances: Performance[] = [];

  // Distinct dates that have at least one performance, used to populate the day selector.
  festivalDays: string[] = [];
  // The date currently selected in the day filter.
  selectedDay: string = '';

  // All stage names active on the selected day.
  allStagesForDay: string[] = [];
  // The stage name currently selected in the stage filter (or the sentinel for "all").
  selectedStage: string = ALL_STAGES;
  // Expose the sentinel value as a class property so the template can compare against it.
  readonly ALL_STAGES = ALL_STAGES;

  // All genre values active on the selected day.
  allGenresForDay: string[] = [];
  // The genre currently selected in the genre filter (or the sentinel for "all").
  selectedGenre: string = ALL_GENRES;
  // Expose the sentinel value as a class property so the template can compare against it.
  readonly ALL_GENRES = ALL_GENRES;

  // The unique stage names visible after all filters are applied.
  stages: string[] = [];
  // The unique start times visible after all filters are applied, sorted chronologically.
  times: string[] = [];
  // Performances that pass the current day, stage, and genre filters.
  filteredPerformances: Performance[] = [];
  // A lookup keyed by "startTime-stageName" so the template can find a cell's performance quickly.
  performanceGrid: Record<string, Performance | undefined> = {};

  // Scheduling conflicts found on the selected day, shown as warnings in the grid.
  conflicts: ConflictInfo[] = [];

  // True when the personal schedule contains at least one time clash.
  hasScheduleClashes = false;
  // The tooltip text shown when the Google Calendar export button is disabled due to clashes.
  readonly clashDisableReason = 'Resolve schedule clashes before downloading';

  // Performances the user has saved to their personal schedule.
  savedPerformances: Performance[] = [];
  // A fast-lookup set of saved performance ids used to highlight grid cells.
  savedIds: Set<string> = new Set();
  // Overlapping saved performances — shown as warnings in the personal schedule view.
  personalConflicts: PersonalConflict[] = [];
  // Distinct dates present in the personal schedule, used to group the personal list.
  personalDays: string[] = [];
  // Maps festival ids to festival names so the personal list can label each entry.
  festivalNameById: Record<string, string> = {};
  // The id of the performance currently being removed, used to animate its exit.
  removingId: string | null = null;
  // True while the Google Calendar export redirect is in progress.
  calendarExportInProgress = false;
  // Controls what kind of status banner to show — success, error, info, or nothing.
  calendarStatusType: 'success' | 'error' | 'info' | null = null;
  // The message shown in the calendar status banner.
  calendarStatusMessage = '';
  // A stable identifier for this browser/device used to link the OAuth callback.
  private deviceUserId = '';

  // Subscription to the personal schedule stream, kept so it can be cleaned up on destroy.
  private savedSub?: Subscription;

  // Duplicated sentinel constants so the template can reference them without method calls.
  readonly ALL_STAGES_CONST = ALL_STAGES;
  readonly ALL_GENRES_CONST = ALL_GENRES;

  // Inject all services needed to load schedules, festivals, personal saves, calendar, and routing.
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private scheduleService: ScheduleService,
    private injector: Injector,
    private festivalService: FestivalService,
    public personalSchedule: PersonalScheduleService,
    private calendarService: CalendarService,
    @Inject(LOCAL_STORAGE) private storage: Storage,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Ensure this device has a stable id before making any calendar-related calls.
    this.deviceUserId = this.getOrCreateDeviceUserId();
    // Read and clear any calendar callback query params left over from an OAuth redirect.
    this.consumeCalendarCallbackParams();

    // Try to read a festival id from the URL — its absence means we are on the global personal view.
    this.festivalId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.festivalId) {
      // No festival in the URL, so default to showing the personal schedule tab.
      this.activeView = 'personal';
    }

    // Load all festivals so the name-lookup map is populated.
    this.festivalService.load().subscribe({
      next: (festivals) => {
        // Build a map from festival id to name so individual performances can show their festival.
        this.festivalNameById = festivals.reduce(
          (lookup, f) => {
            lookup[f.id] = f.name;
            return lookup;
          },
          {} as Record<string, string>,
        );
        // Set the page heading name to the specific festival being viewed, if any.
        this.festivalName = this.festivalId
          ? (festivals.find((f) => f.id === this.festivalId)?.name ?? '')
          : '';
        this.cdr.detectChanges();
      },
      error: () => {
        // Default to empty maps so the template doesn't break if the festival load fails.
        this.festivalNameById = {};
        this.festivalName = '';
        this.cdr.detectChanges();
      },
    });

    if (this.festivalId) {
      // Fetch performances from the API; the signal update fires the effect below.
      this.scheduleService.loadByFestival(this.festivalId).subscribe({
        error: () => {
          // Clear performances and rebuild the view with an empty state if loading fails.
          this.allPerformances = [];
          this.syncViewStateFromStore();
        },
      });

      // React to signal changes so the grid stays in sync after adds and deletes.
      effect(
        () => {
          // Pull the latest performances from the in-memory signal store.
          this.allPerformances = this.scheduleService.getPerformancesByFestival(this.festivalId);
          this.syncViewStateFromStore();
          this.cdr.detectChanges(); // ensure UI updates after signal-triggered changes
        },
        { injector: this.injector },
      );
    }

    // Subscribe to the personal schedule stream so saved/unsaved changes update this component.
    this.savedSub = this.personalSchedule.saved$.subscribe((saved) => {
      // Refresh all personal-schedule state whenever the saved list changes.
      this.savedPerformances = saved;
      // Rebuild the id set for fast "is this performance saved?" lookups.
      this.savedIds = new Set(saved.map((p) => p.id));
      // Recalculate which saved performances overlap in time.
      this.personalConflicts = this.personalSchedule.getPersonalConflicts();
      // Update the clash flag so the calendar export button enables or disables correctly.
      this.hasScheduleClashes = this.personalConflicts.length > 0;
      // Rebuild the list of distinct days so the personal view can group entries by date.
      this.personalDays = [...new Set(saved.map((p) => p.date))].sort();
    });
  }

  ngOnDestroy(): void {
    // Unsubscribe from the personal schedule stream to prevent memory leaks.
    this.savedSub?.unsubscribe();
  }

  // ---- Tab Navigation ----------------------------------------------------

  setView(view: ActiveView): void {
    // Switch the visible tab to the one the user clicked.
    this.activeView = view;
  }

  toggleMobileFilters(): void {
    // Show the filter panel if it was hidden, or hide it if it was showing.
    this.mobileFiltersExpanded = !this.mobileFiltersExpanded;
  }

  // ---- User Interaction Handlers (Festival Schedule) ---------------------

  selectDay(day: string): void {
    // Update the selected day and reset both stage and genre filters back to "all".
    this.selectedDay = day;
    this.selectedStage = ALL_STAGES;
    this.selectedGenre = ALL_GENRES;
    // Recalculate which stages and genres are available for the newly selected day.
    this.refreshFilterOptionsForSelectedDay();
    // Re-run the filters so the grid shows only performances on this day.
    this.applyFilters();
  }

  selectStage(stage: string): void {
    // Update the stage filter and re-run the grid with the new selection.
    this.selectedStage = stage;
    this.applyFilters();
  }

  selectGenre(genre: string): void {
    // Update the genre filter and re-run the grid with the new selection.
    this.selectedGenre = genre;
    this.applyFilters();
  }

  private syncViewStateFromStore(): void {
    // Derive the set of days that have at least one performance from the current data.
    this.festivalDays = [...new Set(this.allPerformances.map((p) => p.date))].sort();

    if (this.festivalDays.length === 0) {
      // No performances at all — reset all filter state to a blank slate.
      this.selectedDay = '';
      this.selectedStage = ALL_STAGES;
      this.selectedGenre = ALL_GENRES;
      this.allStagesForDay = [];
      this.allGenresForDay = [];
      this.applyFilters();
      return;
    }

    if (!this.selectedDay || !this.festivalDays.includes(this.selectedDay)) {
      // The previously selected day no longer exists, so fall back to the first available day.
      this.selectedDay = this.festivalDays[0];
      this.selectedStage = ALL_STAGES;
      this.selectedGenre = ALL_GENRES;
    }

    // Rebuild the stage and genre option lists for the current day.
    this.refreshFilterOptionsForSelectedDay();

    if (this.selectedStage !== ALL_STAGES && !this.allStagesForDay.includes(this.selectedStage)) {
      // The previously selected stage is no longer available — reset to "all stages".
      this.selectedStage = ALL_STAGES;
    }
    if (this.selectedGenre !== ALL_GENRES && !this.allGenresForDay.includes(this.selectedGenre)) {
      // The previously selected genre is no longer available — reset to "all genres".
      this.selectedGenre = ALL_GENRES;
    }

    // Apply the (possibly updated) filters to refresh the grid.
    this.applyFilters();
  }

  private refreshFilterOptionsForSelectedDay(): void {
    // Collect only performances that fall on the day the user has selected.
    const dayPerfs = this.allPerformances.filter((p) => p.date === this.selectedDay);
    // Build the sorted list of unique stage names available on this day.
    this.allStagesForDay = [...new Set(dayPerfs.map((p) => p.stageName))].sort();
    // Build the sorted list of unique genre values available on this day, excluding blanks.
    this.allGenresForDay = [
      ...new Set(dayPerfs.map((p) => p.genre).filter((g): g is string => !!g)),
    ].sort();
  }

  // ---- Personal Schedule Actions -----------------------------------------

  toggleSaved(perf: Performance, event: Event): void {
    // Stop the click from propagating so the card behind the button doesn't also react.
    event.stopPropagation();
    // Add the performance to the personal schedule, or remove it if it is already there.
    this.personalSchedule.toggle(perf);
  }

  removeSaved(perfId: string, event: Event): void {
    // Stop the click from propagating so the surrounding list item doesn't also react.
    event.stopPropagation();
    // Remove this specific performance from the personal schedule.
    this.personalSchedule.remove(perfId);
  }

  clearPersonalSchedule(): void {
    // Do nothing if the schedule is already empty.
    if (this.savedPerformances.length === 0) return;
    // Remove every saved performance from the personal schedule at once.
    this.personalSchedule.clearAll();
  }

  addSavedPerformancesToGoogleCalendar(): void {
    // Don't start an export if there is nothing saved or one is already in progress.
    if (this.savedPerformances.length === 0 || this.calendarExportInProgress) {
      return;
    }

    if (this.hasScheduleClashes) {
      // Block the export and show the reason when time clashes exist.
      this.calendarStatusType = 'info';
      this.calendarStatusMessage = this.clashDisableReason;
      return;
    }

    // Read the browser's local timezone to pass to the calendar service.
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    // De-duplicate performance ids in case the same performance appears more than once.
    const performanceIds = [
      ...new Set(this.savedPerformances.map((performance) => performance.id)),
    ];

    if (performanceIds.length === 0) {
      // Guard against an empty id list after de-duplication.
      this.calendarStatusType = 'error';
      this.calendarStatusMessage = 'No saved performances were selected for export.';
      return;
    }

    // Lock the button and show a status message while the redirect is being prepared.
    this.calendarExportInProgress = true;
    this.calendarStatusType = 'info';
    this.calendarStatusMessage = 'Redirecting to Google for calendar authorization...';

    try {
      // Kick off the OAuth flow which will redirect the browser to Google.
      this.calendarService.beginGoogleCalendarExport({
        performanceIds,
        deviceUserId: this.deviceUserId,
        timezone,
      });
    } catch {
      // If the redirect call itself throws, unlock the button and show an error.
      this.calendarExportInProgress = false;
      this.calendarStatusType = 'error';
      this.calendarStatusMessage = 'Unable to start Google Calendar export.';
    }
  }

  savedForDay(date: string): Performance[] {
    // Helper that converts "HH:MM" to total minutes so times can be compared numerically.
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    // Return only the saved performances on the given date, sorted by start time.
    return this.savedPerformances
      .filter((p) => p.date === date)
      .sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
  }

  formatDisplayTime(timeString: string): string {
    // Split the 24-hour time string into its hour and minute parts.
    const [hoursText, minutesText] = timeString.split(':');
    const hours = Number(hoursText);
    const minutes = Number(minutesText);
    // Return the raw string unchanged if it is not a valid time.
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeString;
    // Choose AM or PM based on whether the hour is before or after noon.
    const suffix = hours >= 12 ? 'PM' : 'AM';
    // Convert to 12-hour clock, replacing 0 with 12.
    const normalizedHours = hours % 12 || 12;
    // Return the formatted time with zero-padded parts and the AM/PM suffix.
    return `${String(normalizedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
  }

  hasPersonalConflict(perfId: string): boolean {
    // Check whether this performance is part of any saved-schedule time clash.
    return this.personalConflicts.some((c) => c.a.id === perfId || c.b.id === perfId);
  }

  festivalLabelForPerformance(perf: Performance): string {
    // Look up the festival name by id, falling back to a generic label if not found.
    return this.festivalNameById[perf.festivalId] ?? 'Festival';
  }

  // ---- Private View-Building Logic --------------------------------------

  private applyFilters(): void {
    // Start with all performances on the selected day.
    let dayPerfs = this.allPerformances.filter((p) => p.date === this.selectedDay);

    if (this.selectedStage !== ALL_STAGES) {
      // Narrow the list further to only the chosen stage.
      dayPerfs = dayPerfs.filter((p) => p.stageName === this.selectedStage);
    }
    if (this.selectedGenre !== ALL_GENRES) {
      // Narrow the list further to only the chosen genre.
      dayPerfs = dayPerfs.filter((p) => p.genre === this.selectedGenre);
    }

    // Store the filtered result for the template to iterate.
    this.filteredPerformances = dayPerfs;
    // Derive the unique sorted stage names from the filtered set for the grid column headers.
    this.stages = [...new Set(this.filteredPerformances.map((p) => p.stageName))].sort();

    // Helper that converts "HH:MM" into total minutes for chronological sorting.
    const timeToMinutes = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    // Derive the unique sorted start times from the filtered set for the grid row headers.
    this.times = [...new Set(this.filteredPerformances.map((p) => p.startTime))].sort(
      (a, b) => timeToMinutes(a) - timeToMinutes(b),
    );

    // Reset and rebuild the grid lookup so the template can find each cell's performance in O(1).
    this.performanceGrid = {};
    for (const perf of this.filteredPerformances) {
      this.performanceGrid[`${perf.startTime}-${perf.stageName}`] = perf;
    }

    // Recalculate scheduling conflicts whenever the visible set of performances changes.
    this.detectConflicts();
  }

  private detectConflicts(): void {
    // Only look for conflicts within the currently selected day.
    const allDayPerfs = this.allPerformances.filter((p) => p.date === this.selectedDay);

    // Group performances by stage so we only compare performances on the same stage.
    const byStage: Record<string, Performance[]> = {};
    for (const perf of allDayPerfs) {
      if (!byStage[perf.stageName]) byStage[perf.stageName] = [];
      byStage[perf.stageName].push(perf);
    }

    // Helper that converts "HH:MM" into total minutes for overlap arithmetic.
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    // Helper that turns total minutes back into an "HH:MM" string for display.
    const toTimeStr = (m: number) =>
      `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

    // Collect every overlapping pair into this list.
    const found: ConflictInfo[] = [];

    for (const [stage, perfs] of Object.entries(byStage)) {
      // Compare every unique pair of performances on this stage.
      for (let i = 0; i < perfs.length; i++) {
        for (let j = i + 1; j < perfs.length; j++) {
          const a = perfs[i];
          const b = perfs[j];
          // Two performances overlap when one starts before the other ends.
          const overlap =
            toMin(a.startTime) < toMin(b.endTime) && toMin(a.endTime) > toMin(b.startTime);
          if (overlap) {
            // Calculate the exact overlapping window for the conflict display.
            const overlapStart = Math.max(toMin(a.startTime), toMin(b.startTime));
            const overlapEnd = Math.min(toMin(a.endTime), toMin(b.endTime));
            found.push({
              time: `${toTimeStr(overlapStart)}–${toTimeStr(overlapEnd)}`,
              stage,
              artists: [a.artistName, b.artistName],
              ids: [a.id, b.id],
            });
          }
        }
      }
    }

    // Replace the previous conflict list with the newly detected conflicts.
    this.conflicts = found;
  }

  hasConflict(time: string, stage: string): boolean {
    // Find the performance sitting in this grid cell, if any.
    const perf = this.performanceGrid[`${time}-${stage}`];
    if (!perf) return false;
    // Return true if any known conflict involves this performance on this stage.
    return this.conflicts.some((c) => c.stage === stage && c.ids.includes(perf.id));
  }

  private getOrCreateDeviceUserId(): string {
    // The localStorage key where the device id is persisted across page loads.
    const storageKey = environment.calendarDeviceStorageKey;
    const existing = this.storage.getItem(storageKey);
    if (existing && /^[A-Za-z0-9_-]{8,128}$/.test(existing)) {
      // A valid id already exists — reuse it so the same device always sends the same id.
      return existing;
    }
    // No valid id found — generate a fresh one and store it for future visits.
    const generated = this.generateDeviceUserId();
    this.storage.setItem(storageKey, generated);
    return generated;
  }

  private generateDeviceUserId(): string {
    // Fill a byte array with cryptographically random data.
    const bytes = new Uint8Array(12);
    globalThis.crypto.getRandomValues(bytes);
    // Encode the bytes as URL-safe Base64 and trim it to 16 characters.
    const randomPart = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')
      .slice(0, 16);
    // Append a timestamp component in base-36 to make the id unique per session.
    const timePart = Date.now().toString(36);
    // Prefix with "mfp_" so the id is clearly application-specific.
    return `mfp_${timePart}_${randomPart}`;
  }

  private consumeCalendarCallbackParams(): void {
    // Read the query parameters left by the OAuth callback redirect.
    const queryParamMap = this.route.snapshot?.queryParamMap;
    if (!queryParamMap || typeof queryParamMap.get !== 'function') {
      return;
    }

    // Check whether the callback carried a calendar status — if not, there's nothing to process.
    const status = queryParamMap.get('calendarStatus');
    if (!status) {
      return;
    }

    if (status === 'success') {
      // Parse the counts from the callback so we can show the user a detailed summary.
      const created = Number(queryParamMap.get('created') || '0');
      const skipped = Number(queryParamMap.get('skipped') || '0');
      const failed = Number(queryParamMap.get('failed') || '0');
      const total = Number(queryParamMap.get('total') || '0');

      // Show a warning-level banner when at least one event failed, otherwise show success.
      this.calendarStatusType = failed > 0 ? 'info' : 'success';
      this.calendarStatusMessage = `Google Calendar export complete: ${created}/${total} created, ${skipped} skipped, ${failed} failed.`;

      // Append the first failure reason to the message if the backend provided details.
      const failureDetails = queryParamMap.get('failureDetails');
      if (failureDetails) {
        try {
          const parsedFailures = JSON.parse(failureDetails) as Array<{ reason?: string }>;
          if (Array.isArray(parsedFailures) && parsedFailures.length > 0) {
            const firstReason = parsedFailures[0]?.reason || 'One or more items failed.';
            this.calendarStatusMessage = `${this.calendarStatusMessage} ${firstReason}`;
          }
        } catch {
          // Ignore malformed failure details and keep aggregate message.
        }
      }
    } else {
      // Any non-success status means the export failed — show the server's message or a default.
      this.calendarStatusType = 'error';
      this.calendarStatusMessage =
        queryParamMap.get('calendarMessage') || 'Google Calendar export failed.';
    }

    // Remove the calendar query params from the URL so a page refresh doesn't re-trigger this code.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
  }
}
