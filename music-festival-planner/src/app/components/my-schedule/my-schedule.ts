import { Component, Injector, OnInit, OnDestroy, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ScheduleService } from '../../services/schedule.service';
import { FestivalService } from '../../services/festival.service';
import { PersonalScheduleService, PersonalConflict } from '../../services/personal-schedule.service';
import { Performance } from '../../models/performance.model';

// ---- Filter Sentinels ------------------------------------------------------

/** Sentinel string meaning "no stage filter is active — show all stages". */
export const ALL_STAGES = 'All Stages';

/** Sentinel string meaning "no genre filter is active — show all genres". */
export const ALL_GENRES = 'All Genres';

// ---- Types -----------------------------------------------------------------

/**
 * Describes a detected scheduling conflict on the festival timetable:
 * two or more performances share a stage with overlapping time windows.
 */
export interface ConflictInfo {
  time: string;
  stage: string;
  artists: string[];
  ids: string[];
}

/** The two top-level views the component can display. */
export type ActiveView = 'festival' | 'personal';

// ---- Component -------------------------------------------------------------

@Component({
  selector: 'app-my-schedule',
  standalone: false,
  templateUrl: './my-schedule.html',
  styleUrl: './my-schedule.css',
})
export class MySchedule implements OnInit, OnDestroy {

  // ---- View State ---

  /** Which tab is currently displayed. */
  activeView: ActiveView = 'festival';

  // ---- Festival Data ---

  /** ID of the festival being viewed (read from the :id URL param). */
  festivalId: string = '';

  /** Name of the festival being viewed, shown in the page header. */
  festivalName: string = '';

  /** Full unfiltered list of all performances for this festival. */
  allPerformances: Performance[] = [];

  // ---- Day Tabs ---

  /** Sorted unique performance dates — one button per date in the day-tab row. */
  festivalDays: string[] = [];

  /** The date whose timetable is currently displayed. */
  selectedDay: string = '';

  // ---- Stage Filter ---

  allStagesForDay: string[] = [];
  selectedStage: string = ALL_STAGES;
  readonly ALL_STAGES = ALL_STAGES;

  // ---- Genre Filter ---

  allGenresForDay: string[] = [];
  selectedGenre: string = ALL_GENRES;
  readonly ALL_GENRES = ALL_GENRES;

  // ---- Timetable Data ---

  stages: string[] = [];
  times: string[] = [];
  filteredPerformances: Performance[] = [];
  performanceGrid: Record<string, Performance | undefined> = {};

  // ---- Festival Conflict Detection ---

  conflicts: ConflictInfo[] = [];

  // ---- Personal Schedule State ---

  /** Current snapshot of the user's saved performances (updated reactively). */
  savedPerformances: Performance[] = [];

  /** Set of saved performance IDs for O(1) "is this saved?" checks in the template. */
  savedIds: Set<string> = new Set();

  /** Personal schedule conflicts (cross-stage, user-specific). */
  personalConflicts: PersonalConflict[] = [];

  /** Sorted unique dates present in the personal schedule. */
  personalDays: string[] = [];

  /** Quick lookup map for festival names by ID (used in personal cards). */
  festivalNameById: Record<string, string> = {};

  /** IDs of performances the user is currently hovering the remove button on. */
  removingId: string | null = null;

  private savedSub?: Subscription;

  // ---- Exposed constants for template ------------------------------------

  readonly ALL_STAGES_CONST = ALL_STAGES;
  readonly ALL_GENRES_CONST = ALL_GENRES;

  // -----------------------------------------------------------------------

  constructor(
    private route: ActivatedRoute,
    private scheduleService: ScheduleService,
    private injector: Injector,
    private festivalService: FestivalService,
    public personalSchedule: PersonalScheduleService,
  ) {}

  ngOnInit(): void {
    this.festivalNameById = this.festivalService.getFestivals().reduce((lookup, festival) => {
      lookup[festival.id] = festival.name;
      return lookup;
    }, {} as Record<string, string>);

    this.festivalId = this.route.snapshot.paramMap.get('id') ?? '';
    this.festivalName = this.festivalId
      ? this.festivalService.getFestivalById(this.festivalId)?.name ?? ''
      : '';

    if (this.festivalId) {
      // Keep this component synced with shared schedule state via Angular Signals.
      effect(() => {
        this.allPerformances = this.scheduleService.getPerformancesByFestival(this.festivalId);
        this.syncViewStateFromStore();
      }, { injector: this.injector });
    }

    // Subscribe to the personal schedule so the UI stays in sync with any
    // add/remove action — whether triggered from this component or elsewhere.
    this.savedSub = this.personalSchedule.saved$.subscribe(saved => {
      this.savedPerformances = saved;
      this.savedIds = new Set(saved.map(p => p.id));
      this.personalConflicts = this.personalSchedule.getPersonalConflicts();
      this.personalDays = [...new Set(saved.map(p => p.date))].sort();
    });
  }

  ngOnDestroy(): void {
    this.savedSub?.unsubscribe();
  }

  // ---- Tab Navigation ----------------------------------------------------

  setView(view: ActiveView): void {
    this.activeView = view;
  }

  // ---- User Interaction Handlers (Festival Schedule) ---------------------

  selectDay(day: string): void {
    this.selectedDay   = day;
    this.selectedStage = ALL_STAGES;
    this.selectedGenre = ALL_GENRES;

    this.refreshFilterOptionsForSelectedDay();

    this.applyFilters();
  }

  selectStage(stage: string): void {
    this.selectedStage = stage;
    this.applyFilters();
  }

  selectGenre(genre: string): void {
    this.selectedGenre = genre;
    this.applyFilters();
  }

  /**
   * Reconciles selected-day/filter state after any shared schedule change.
   * Preserves current selections when still valid.
   */
  private syncViewStateFromStore(): void {
    this.festivalDays = [...new Set(this.allPerformances.map((p) => p.date))].sort();

    if (this.festivalDays.length === 0) {
      this.selectedDay = '';
      this.selectedStage = ALL_STAGES;
      this.selectedGenre = ALL_GENRES;
      this.allStagesForDay = [];
      this.allGenresForDay = [];
      this.applyFilters();
      return;
    }

    // Select a valid day whenever data changes remove the current day.
    if (!this.selectedDay || !this.festivalDays.includes(this.selectedDay)) {
      this.selectedDay = this.festivalDays[0];
      this.selectedStage = ALL_STAGES;
      this.selectedGenre = ALL_GENRES;
    }

    this.refreshFilterOptionsForSelectedDay();

    // If filters became invalid after data changes, reset them to "All".
    if (this.selectedStage !== ALL_STAGES && !this.allStagesForDay.includes(this.selectedStage)) {
      this.selectedStage = ALL_STAGES;
    }
    if (this.selectedGenre !== ALL_GENRES && !this.allGenresForDay.includes(this.selectedGenre)) {
      this.selectedGenre = ALL_GENRES;
    }

    this.applyFilters();
  }

  /** Recomputes available stage/genre options for the currently selected day. */
  private refreshFilterOptionsForSelectedDay(): void {
    const dayPerformances = this.allPerformances.filter((p) => p.date === this.selectedDay);
    this.allStagesForDay = [...new Set(dayPerformances.map((p) => p.stageName))].sort();
    this.allGenresForDay = [
      ...new Set(dayPerformances.map((p) => p.genre).filter((g): g is string => !!g)),
    ].sort();
  }

  // ---- Personal Schedule Actions -----------------------------------------

  /**
   * Toggles a performance in/out of the personal schedule.
   * Called from both the festival timetable (Add button) and the
   * personal schedule itinerary (Remove button).
   */
  toggleSaved(perf: Performance, event: Event): void {
    event.stopPropagation(); // prevent any parent click handlers from firing
    this.personalSchedule.toggle(perf);
  }

  /**
   * Removes a specific performance from the personal schedule.
   * Called from the personal schedule itinerary view.
   */
  removeSaved(perfId: string, event: Event): void {
    event.stopPropagation();
    this.personalSchedule.remove(perfId);
  }

  /** Clears all personal schedule entries after confirmation. */
  clearPersonalSchedule(): void {
    if (this.savedPerformances.length === 0) return;
    this.personalSchedule.clearAll();
  }

  /**
   * Returns performances saved for a specific date, sorted by start time.
   * Used to render the personal schedule itinerary grouped by day.
   */
  savedForDay(date: string): Performance[] {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    return this.savedPerformances
      .filter(p => p.date === date)
      .sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
  }

  /**
   * Formats a stored 24-hour time string for display in 12-hour format.
   *
   * @param timeString Time string in HH:mm or H:mm format.
   * @returns Formatted time string such as "06:00 PM".
   */
  formatDisplayTime(timeString: string): string {
    const [hoursText, minutesText] = timeString.split(':');
    const hours = Number(hoursText);
    const minutes = Number(minutesText);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return timeString;
    }

    const suffix = hours >= 12 ? 'PM' : 'AM';
    const normalizedHours = hours % 12 || 12;
    return `${String(normalizedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
  }

  /**
   * Returns true when the given performance has a personal conflict
   * (overlaps with another saved performance on the same day).
   */
  hasPersonalConflict(perfId: string): boolean {
    return this.personalConflicts.some(c => c.a.id === perfId || c.b.id === perfId);
  }

  /**
   * Returns the festival label to display for a saved performance card.
   */
  festivalLabelForPerformance(perf: Performance): string {
    return this.festivalNameById[perf.festivalId] ?? 'Festival';
  }

  // ---- Private View-Building Logic --------------------------------------

  private applyFilters(): void {
    let dayPerformances = this.allPerformances.filter(p => p.date === this.selectedDay);

    if (this.selectedStage !== ALL_STAGES) {
      dayPerformances = dayPerformances.filter(p => p.stageName === this.selectedStage);
    }
    if (this.selectedGenre !== ALL_GENRES) {
      dayPerformances = dayPerformances.filter(p => p.genre === this.selectedGenre);
    }

    this.filteredPerformances = dayPerformances;
    this.stages = [...new Set(this.filteredPerformances.map(p => p.stageName))].sort();

    const timeToMinutes = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    this.times = [...new Set(this.filteredPerformances.map(p => p.startTime))]
      .sort((a, b) => timeToMinutes(a) - timeToMinutes(b));

    this.performanceGrid = {};
    for (const perf of this.filteredPerformances) {
      this.performanceGrid[`${perf.startTime}-${perf.stageName}`] = perf;
    }

    this.detectConflicts();
  }

  private detectConflicts(): void {
    const allDayPerfs = this.allPerformances.filter(p => p.date === this.selectedDay);

    const byStage: Record<string, Performance[]> = {};
    for (const perf of allDayPerfs) {
      if (!byStage[perf.stageName]) byStage[perf.stageName] = [];
      byStage[perf.stageName].push(perf);
    }

    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const toTimeStr = (m: number) =>
      `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

    const found: ConflictInfo[] = [];

    for (const [stage, perfs] of Object.entries(byStage)) {
      for (let i = 0; i < perfs.length; i++) {
        for (let j = i + 1; j < perfs.length; j++) {
          const a = perfs[i];
          const b = perfs[j];
          const overlap = toMin(a.startTime) < toMin(b.endTime) &&
                          toMin(a.endTime)   > toMin(b.startTime);
          if (overlap) {
            const overlapStart = Math.max(toMin(a.startTime), toMin(b.startTime));
            const overlapEnd   = Math.min(toMin(a.endTime),   toMin(b.endTime));
            found.push({
              time:    `${toTimeStr(overlapStart)}–${toTimeStr(overlapEnd)}`,
              stage,
              artists: [a.artistName, b.artistName],
              ids:     [a.id, b.id],
            });
          }
        }
      }
    }

    this.conflicts = found;
  }

  hasConflict(time: string, stage: string): boolean {
    const perf = this.performanceGrid[`${time}-${stage}`];
    if (!perf) return false;
    return this.conflicts.some(c => c.stage === stage && c.ids.includes(perf.id));
  }
}