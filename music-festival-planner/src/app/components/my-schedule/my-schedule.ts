import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ScheduleService } from '../../services/schedule.service';
import { Performance } from '../../models/performance.model';

// ---- Filter Constants ------------------------------------------------------

/** Sentinel value for the "no stage filter active" state. */
export const ALL_STAGES_FILTER = 'All Stages';

/** Sentinel value for the "no genre filter active" state. */
export const ALL_GENRES_FILTER = 'All Genres';

// ---- Types -----------------------------------------------------------------

/**
 * Describes a detected scheduling conflict between two or more performances
 * that share a stage and have overlapping time windows.
 */
export interface ConflictInfo {
  /** Human-readable time range that covers the overlap (e.g. "18:00–19:00"). */
  conflictTimeRange: string;
  /** Name of the stage where the conflict occurs. */
  stageName: string;
  /** Display names of the artists whose sets overlap. */
  conflictingArtistNames: string[];
}

// ---- Component -------------------------------------------------------------

@Component({
  selector: 'app-my-schedule',
  standalone: false,
  templateUrl: './my-schedule.html',
  styleUrl: './my-schedule.css',
})
export class MySchedule implements OnInit {
  /** ID of the festival whose schedule is being viewed (from the URL param). */
  festivalId: string = '';

  /** Full unfiltered list of all performances for this festival. */
  allPerformances: Performance[] = [];

  // ---- Day Tabs ---

  /** Sorted list of unique performance dates, shown as day-selector tabs. */
  festivalDays: string[] = [];

  /** The date currently selected in the day-tab row. */
  selectedDay: string = '';

  // ---- Stage Filter ---

  /** All stages that have at least one performance on the selected day. */
  allStagesForSelectedDay: string[] = [];

  /** Currently active stage filter; defaults to the "show all" sentinel. */
  selectedStageFilter: string = ALL_STAGES_FILTER;

  /** Expose the sentinel to the template so it can compare without importing. */
  readonly ALL_STAGES_FILTER = ALL_STAGES_FILTER;

  // ---- Genre Filter ---

  /** All genres present among performances on the selected day. */
  allGenresForSelectedDay: string[] = [];

  /** Currently active genre filter; defaults to the "show all" sentinel. */
  selectedGenreFilter: string = ALL_GENRES_FILTER;

  /** Expose the sentinel to the template so it can compare without importing. */
  readonly ALL_GENRES_FILTER = ALL_GENRES_FILTER;

  // ---- Timetable Data ---

  /** Stage column headers for the current filter view. */
  visibleStages: string[] = [];

  /** Time row headers for the current filter view, sorted chronologically. */
  visibleTimes: string[] = [];

  /** Performances that pass the active day + stage + genre filters. */
  filteredPerformances: Performance[] = [];

  /**
   * Lookup dictionary for O(1) timetable cell rendering.
   * Key format:  "HH:mm-Stage Name"  (e.g. "18:00-Main Stage")
   * Value:  the Performance occupying that cell, or undefined if the slot is empty.
   */
  performanceGridLookup: Record<string, Performance | undefined> = {};

  // ---- Conflict Detection ---

  /** All scheduling conflicts detected on the currently selected day. */
  detectedConflicts: ConflictInfo[] = [];

  // --------------------------------------------------------------------

  constructor(
    private activeRoute: ActivatedRoute,
    private scheduleService: ScheduleService
  ) {}

  ngOnInit(): void {
    // Read the festival ID from the URL (:id param); fall back to '1' for the
    // standalone /my-schedule route that has no ID in the URL.
    this.festivalId = this.activeRoute.snapshot.paramMap.get('id') ?? '1';

    // Load all performances for this festival once on component init.
    this.allPerformances = this.scheduleService.getPerformancesByFestival(this.festivalId);

    // Derive the sorted list of unique dates to populate the day-tab row.
    this.festivalDays = [
      ...new Set(this.allPerformances.map((performance) => performance.date))
    ].sort();

    // Auto-select the first available day so the timetable is never blank on load.
    if (this.festivalDays.length > 0) {
      this.selectDay(this.festivalDays[0]);
    }
  }

  // ---- User Interaction Handlers -----------------------------------------

  /** Called when the user clicks a day tab. Resets both filters and rebuilds the view. */
  selectDay(day: string): void {
    this.selectedDay          = day;
    this.selectedStageFilter  = ALL_STAGES_FILTER; // reset stage filter on day change
    this.selectedGenreFilter  = ALL_GENRES_FILTER; // reset genre filter on day change

    // Compute the unique stages and genres available on this day for the filter bars.
    const performancesOnDay = this.allPerformances.filter(
      (performance) => performance.date === day
    );

    this.allStagesForSelectedDay = [
      ...new Set(performancesOnDay.map((performance) => performance.stageName))
    ].sort();

    this.allGenresForSelectedDay = [
      ...new Set(
        performancesOnDay
          .map((performance) => performance.genre)
          .filter((genre): genre is string => !!genre) // drop undefined genres
      )
    ].sort();

    this.applyFiltersAndRebuildGrid();
  }

  /** Called when the user clicks a stage filter button. */
  selectStageFilter(stageName: string): void {
    this.selectedStageFilter = stageName;
    this.applyFiltersAndRebuildGrid();
  }

  /** Called when the user clicks a genre filter button. */
  selectGenreFilter(genreName: string): void {
    this.selectedGenreFilter = genreName;
    this.applyFiltersAndRebuildGrid();
  }

  // ---- Private View-Building Logic ---------------------------------------

  /**
   * Applies the active day + stage + genre filters to produce the visible
   * performance set, then rebuilds the timetable grid and re-runs conflict detection.
   * Called whenever any filter changes.
   */
  private applyFiltersAndRebuildGrid(): void {
    // Start with all performances on the selected day.
    let visiblePerformances = this.allPerformances.filter(
      (performance) => performance.date === this.selectedDay
    );

    // Narrow down by stage if a specific stage is selected.
    if (this.selectedStageFilter !== ALL_STAGES_FILTER) {
      visiblePerformances = visiblePerformances.filter(
        (performance) => performance.stageName === this.selectedStageFilter
      );
    }

    // Narrow down further by genre if a specific genre is selected.
    if (this.selectedGenreFilter !== ALL_GENRES_FILTER) {
      visiblePerformances = visiblePerformances.filter(
        (performance) => performance.genre === this.selectedGenreFilter
      );
    }

    this.filteredPerformances = visiblePerformances;

    // Derive unique stage column headers from the filtered set.
    this.visibleStages = [
      ...new Set(this.filteredPerformances.map((performance) => performance.stageName))
    ].sort();

    // Derive unique time row headers, sorted by clock time (minutes since midnight).
    this.visibleTimes = [
      ...new Set(this.filteredPerformances.map((performance) => performance.startTime))
    ].sort((timeA, timeB) => this.timeStringToMinutes(timeA) - this.timeStringToMinutes(timeB));

    // Build the O(1) lookup dictionary used by the timetable template.
    this.performanceGridLookup = {};
    for (const performance of this.filteredPerformances) {
      // Key combines startTime + stageName so each cell maps to exactly one performance.
      const cellKey = `${performance.startTime}-${performance.stageName}`;
      this.performanceGridLookup[cellKey] = performance;
    }

    // Detect any booking conflicts on this day (checks all day performances,
    // not just the filtered subset, so hidden performances can still be flagged).
    this.detectSchedulingConflicts();
  }

  /**
   * Scans all performances on the selected day for time-window overlaps
   * within the same stage and populates the detectedConflicts array.
   *
   * Algorithm: group by stage → compare every pair within each stage group.
   * This is O(n²) per stage, which is fine for typical festival sizes.
   */
  private detectSchedulingConflicts(): void {
    // Collect all performances on the current day (unfiltered, so we catch
    // conflicts that might be hidden by the current stage/genre filter).
    const allPerformancesOnDay = this.allPerformances.filter(
      (performance) => performance.date === this.selectedDay
    );

    // Group performances by stage name for efficient pairwise comparison.
    const performancesByStage: Record<string, Performance[]> = {};
    for (const performance of allPerformancesOnDay) {
      if (!performancesByStage[performance.stageName]) {
        performancesByStage[performance.stageName] = [];
      }
      performancesByStage[performance.stageName].push(performance);
    }

    const foundConflicts: ConflictInfo[] = [];

    // Compare every pair within each stage group.
    for (const [stageName, stagePerformances] of Object.entries(performancesByStage)) {
      for (let indexA = 0; indexA < stagePerformances.length; indexA++) {
        for (let indexB = indexA + 1; indexB < stagePerformances.length; indexB++) {
          const performanceA = stagePerformances[indexA];
          const performanceB = stagePerformances[indexB];

          // Overlap test: A starts before B ends AND A ends after B starts.
          const aStartMinutes = this.timeStringToMinutes(performanceA.startTime);
          const aEndMinutes   = this.timeStringToMinutes(performanceA.endTime);
          const bStartMinutes = this.timeStringToMinutes(performanceB.startTime);
          const bEndMinutes   = this.timeStringToMinutes(performanceB.endTime);

          const timesOverlap =
            aStartMinutes < bEndMinutes && aEndMinutes > bStartMinutes;

          if (timesOverlap) {
            foundConflicts.push({
              conflictTimeRange:      `${performanceA.startTime}–${performanceB.endTime}`,
              stageName:              stageName,
              conflictingArtistNames: [performanceA.artistName, performanceB.artistName],
            });
          }
        }
      }
    }

    this.detectedConflicts = foundConflicts;
  }

  /**
   * Returns true if the performance occupying the given cell is part of a known conflict.
   * Used by the timetable template to apply the .has-conflict CSS class.
   */
  performanceCellHasConflict(startTime: string, stageName: string): boolean {
    const performance = this.performanceGridLookup[`${startTime}-${stageName}`];
    if (!performance) return false;

    // Check if this performance's artist appears in any conflict on this stage.
    return this.detectedConflicts.some(
      (conflict) =>
        conflict.stageName === stageName &&
        conflict.conflictingArtistNames.includes(performance.artistName)
    );
  }

  // ---- Private Utility ---------------------------------------------------

  /**
   * Converts "HH:mm" time strings to total minutes for chronological sorting.
   * Assumes valid format since values come from the schedule service.
   */
  private timeStringToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
