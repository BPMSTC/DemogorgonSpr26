import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ScheduleService } from '../../services/schedule.service';
import { Performance } from '../../models/performance.model';

// ---- Filter Sentinels ------------------------------------------------------

/** Sentinel string meaning "no stage filter is active — show all stages". */
export const ALL_STAGES = 'All Stages';

/** Sentinel string meaning "no genre filter is active — show all genres". */
export const ALL_GENRES = 'All Genres';

// ---- Types -----------------------------------------------------------------

/**
 * Describes a detected scheduling conflict: two or more performances share
 * a stage with overlapping time windows on the same day.
 */
export interface ConflictInfo {
  /** Exact overlap window formatted as "HH:mm–HH:mm" (e.g. "18:00–19:00"). */
  time: string;
  /** Stage name where the conflict occurs. */
  stage: string;
  /** Display names of the artists whose sets overlap. */
  artists: string[];
  /** IDs of the conflicting performances (used for O(1) per-cell lookup). */
  ids: string[];
}

// ---- Component -------------------------------------------------------------

@Component({
  selector: 'app-my-schedule',
  standalone: false,
  templateUrl: './my-schedule.html',
  styleUrl: './my-schedule.css',
})
export class MySchedule implements OnInit {
  /** ID of the festival being viewed (read from the :id URL param). */
  festivalId: string = '';

  /** Full unfiltered list of all performances for this festival. */
  allPerformances: Performance[] = [];

  // ---- Day Tabs ---

  /** Sorted unique performance dates — one button per date in the day-tab row. */
  festivalDays: string[] = [];

  /** The date whose timetable is currently displayed. */
  selectedDay: string = '';

  // ---- Stage Filter ---

  /** Unique stages that have at least one performance on the selected day. */
  allStagesForDay: string[] = [];

  /** Currently active stage filter; equals ALL_STAGES when no filter is applied. */
  selectedStage: string = ALL_STAGES;

  /** Exposed to the template so it can compare without importing the constant. */
  readonly ALL_STAGES = ALL_STAGES;

  // ---- Genre Filter ---

  /** Unique genres present among performances on the selected day. */
  allGenresForDay: string[] = [];

  /** Currently active genre filter; equals ALL_GENRES when no filter is applied. */
  selectedGenre: string = ALL_GENRES;

  /** Exposed to the template so it can compare without importing the constant. */
  readonly ALL_GENRES = ALL_GENRES;

  // ---- Timetable Data ---

  /** Stage column headers derived from the currently filtered performance set. */
  stages: string[] = [];

  /** Time row headers, sorted chronologically, derived from the filtered set. */
  times: string[] = [];

  /** Performances that pass all active filters (day + stage + genre). */
  filteredPerformances: Performance[] = [];

  /**
   * O(1) lookup dictionary for timetable cell rendering.
   * Key format: "HH:mm-Stage Name" — e.g. "18:00-Main Stage".
   * Value: the Performance scheduled in that cell, or undefined if empty.
   */
  performanceGrid: Record<string, Performance | undefined> = {};

  // ---- Conflict Detection ---

  /** All scheduling conflicts found on the currently selected day. */
  conflicts: ConflictInfo[] = [];

  // -------------------------------------------------------------------------

  constructor(
    private route: ActivatedRoute,
    private scheduleService: ScheduleService
  ) {}

  ngOnInit(): void {
    // Read the festival ID from the URL; fall back to '1' for the standalone
    // /my-schedule route which has no :id param in the URL.
    this.festivalId = this.route.snapshot.paramMap.get('id') ?? '1';

    // Load all performances for this festival once on component initialisation.
    this.allPerformances = this.scheduleService.getPerformancesByFestival(this.festivalId);

    // Derive the sorted list of unique dates to build the day-tab buttons.
    this.festivalDays = [
      ...new Set(this.allPerformances.map(p => p.date))
    ].sort();

    // Auto-select the first day so the timetable is never blank on initial load.
    if (this.festivalDays.length > 0) {
      this.selectDay(this.festivalDays[0]);
    }
  }

  // ---- User Interaction Handlers -----------------------------------------

  /** Switches to the given day, resets both filters, and rebuilds the timetable. */
  selectDay(day: string): void {
    this.selectedDay   = day;
    this.selectedStage = ALL_STAGES; // reset stage filter on every day change
    this.selectedGenre = ALL_GENRES; // reset genre filter on every day change

    // Recompute available filter options for the newly selected day.
    const dayPerformances = this.allPerformances.filter(p => p.date === day);
    this.allStagesForDay  = [...new Set(dayPerformances.map(p => p.stageName))].sort();
    this.allGenresForDay  = [
      ...new Set(
        dayPerformances.map(p => p.genre).filter((g): g is string => !!g)
      )
    ].sort();

    this.applyFilters();
  }

  /** Applies the chosen stage filter and rebuilds the visible timetable. */
  selectStage(stage: string): void {
    this.selectedStage = stage;
    this.applyFilters();
  }

  /** Applies the chosen genre filter and rebuilds the visible timetable. */
  selectGenre(genre: string): void {
    this.selectedGenre = genre;
    this.applyFilters();
  }

  // ---- Private View-Building Logic ---------------------------------------

  /**
   * Applies all active filters (day + stage + genre) to produce the visible
   * performance set, then rebuilds the timetable grid and re-runs conflict detection.
   * Called whenever any filter selection changes.
   */
  private applyFilters(): void {
    // Start with all performances on the selected day.
    let dayPerformances = this.allPerformances.filter(p => p.date === this.selectedDay);

    // Narrow down by stage when a specific stage is selected.
    if (this.selectedStage !== ALL_STAGES) {
      dayPerformances = dayPerformances.filter(p => p.stageName === this.selectedStage);
    }

    // Narrow down further by genre when a specific genre is selected.
    if (this.selectedGenre !== ALL_GENRES) {
      dayPerformances = dayPerformances.filter(p => p.genre === this.selectedGenre);
    }

    this.filteredPerformances = dayPerformances;

    // Derive unique stage columns from the filtered set.
    this.stages = [...new Set(this.filteredPerformances.map(p => p.stageName))].sort();

    // Derive unique time rows, sorted chronologically.
    const timeToMinutes = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    this.times = [...new Set(this.filteredPerformances.map(p => p.startTime))]
      .sort((a, b) => timeToMinutes(a) - timeToMinutes(b));

    // Rebuild the O(1) grid lookup dictionary.
    // Key = "startTime-stageName" so each cell maps to exactly one performance.
    this.performanceGrid = {};
    for (const perf of this.filteredPerformances) {
      const gridKey = `${perf.startTime}-${perf.stageName}`;
      this.performanceGrid[gridKey] = perf;
    }

    // Re-run conflict detection whenever the day or filter changes.
    this.detectConflicts();
  }

  /**
   * Scans all performances on the selected day for time-window overlaps within
   * the same stage and populates the `conflicts` array.
   *
   * Algorithm:
   *   1. Group all day's performances by stage name.
   *   2. Within each stage, compare every pair (O(n²) — fine for festival scales).
   *   3. If two performances overlap, compute the exact shared window and record
   *      both artists' IDs for fast per-cell lookup in hasConflict().
   *
   * Note: runs over ALL day performances, not just the filtered subset, so
   * conflicts hidden by the current filter are still surfaced in the banner.
   */
  private detectConflicts(): void {
    const allDayPerfs = this.allPerformances.filter(p => p.date === this.selectedDay);

    // Group by stage so we only compare performances on the same stage.
    const byStage: Record<string, Performance[]> = {};
    for (const perf of allDayPerfs) {
      if (!byStage[perf.stageName]) byStage[perf.stageName] = [];
      byStage[perf.stageName].push(perf);
    }

    // Helper: "HH:mm" → total minutes (for arithmetic comparisons).
    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

    // Helper: total minutes → "HH:mm" string (for the conflict banner display).
    const toTimeStr = (m: number) =>
      `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

    const found: ConflictInfo[] = [];

    for (const [stage, perfs] of Object.entries(byStage)) {
      for (let i = 0; i < perfs.length; i++) {
        for (let j = i + 1; j < perfs.length; j++) {
          const a = perfs[i];
          const b = perfs[j];

          // Standard interval-overlap test: A.start < B.end AND A.end > B.start.
          const overlap = toMin(a.startTime) < toMin(b.endTime) &&
                          toMin(a.endTime)   > toMin(b.startTime);

          if (overlap) {
            // Compute the exact shared window (not just "A overlaps B").
            const overlapStart = Math.max(toMin(a.startTime), toMin(b.startTime));
            const overlapEnd   = Math.min(toMin(a.endTime),   toMin(b.endTime));

            found.push({
              time:    `${toTimeStr(overlapStart)}–${toTimeStr(overlapEnd)}`,
              stage,
              artists: [a.artistName, b.artistName],
              ids:     [a.id, b.id], // stored so hasConflict() can do a fast .includes() check
            });
          }
        }
      }
    }

    this.conflicts = found;
  }

  /**
   * Returns true when the performance in a given cell is part of any known conflict.
   * Uses the pre-built `conflicts` array with ID lookup so the template can call
   * this in every @for loop without re-scanning the full conflict list.
   */
  hasConflict(time: string, stage: string): boolean {
    const perf = this.performanceGrid[`${time}-${stage}`];
    if (!perf) return false;

    // A conflict exists if this performance's ID appears in any conflict entry
    // that also matches this stage.
    return this.conflicts.some(c => c.stage === stage && c.ids.includes(perf.id));
  }
}
