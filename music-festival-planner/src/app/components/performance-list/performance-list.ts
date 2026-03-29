import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ScheduleService } from '../../services/schedule.service';
import { FestivalService } from '../../services/festival.service';
import { Festival } from '../../models/festival.model';
import { Performance } from '../../models/performance.model';

@Component({
  selector: 'app-performance-list',
  standalone: false,
  templateUrl: './performance-list.html',
  styleUrl: './performance-list.css',
})
export class PerformanceListComponent implements OnInit {
  /** The parent festival record (used to show the festival name in the header). */
  currentFestival: Festival | undefined;

  /** All performances for this festival, sorted by date then start time. */
  sortedPerformances: Performance[] = [];

  /** Festival ID extracted from the URL (:id route param). */
  festivalId = '';

  constructor(
    private activeRoute: ActivatedRoute,
    private router: Router,
    private scheduleService: ScheduleService,
    private festivalService: FestivalService
  ) {}

  ngOnInit(): void {
    // Pull festival ID from URL and load the parent festival for the header.
    this.festivalId   = this.activeRoute.snapshot.paramMap.get('id') ?? '';
    this.currentFestival = this.festivalService.getFestivalById(this.festivalId);

    this.refreshPerformanceList();
  }

  /**
   * Fetches the current performance list from the service and sorts it
   * chronologically: first by date (ascending), then by start time within each date.
   * Called on init and after every add/delete/clear operation.
   */
  refreshPerformanceList(): void {
    // Helper to convert "HH:mm" → total minutes for numeric time comparison.
    const convertTimeToMinutes = (timeString: string): number => {
      const [hours, minutes] = timeString.split(':').map(Number);
      return hours * 60 + minutes;
    };

    this.sortedPerformances = this.scheduleService
      .getPerformancesByFestival(this.festivalId)
      .sort((performanceA, performanceB) => {
        // Primary sort: date string comparison (ISO format sorts lexicographically).
        if (performanceA.date !== performanceB.date) {
          return performanceA.date.localeCompare(performanceB.date);
        }
        // Secondary sort: earlier start times come first within the same day.
        return convertTimeToMinutes(performanceA.startTime) -
               convertTimeToMinutes(performanceB.startTime);
      });
  }

  // ---- Navigation Helpers ------------------------------------------------

  /** Routes to the "Add Performance" form for this festival. */
  navigateToAddPerformance(): void {
    this.router.navigate(['/festivals', this.festivalId, 'performances', 'new']);
  }

  /** Routes back to the festivals overview page. */
  navigateBackToFestivals(): void {
    this.router.navigate(['/festivals']);
  }

  // ---- Action Handlers ---------------------------------------------------

  /**
   * Prompts the user to confirm, then removes a single performance by its ID.
   * Refreshes the list so the deleted entry disappears immediately.
   */
  confirmAndDeletePerformance(performanceId: string): void {
    if (confirm('Remove this performance from the lineup?')) {
      this.scheduleService.deletePerformance(performanceId);
      this.refreshPerformanceList(); // re-fetch so the card disappears
    }
  }

  /**
   * Prompts the user to confirm, then removes ALL performances for this festival
   * in a single operation (the "Clear All" button).
   * Refreshes the list so it shows the empty state immediately.
   */
  confirmAndClearAllPerformances(): void {
    if (confirm('Clear ALL performances for this festival? This cannot be undone.')) {
      this.scheduleService.clearPerformancesByFestival(this.festivalId);
      this.refreshPerformanceList(); // re-fetch to show the empty state
    }
  }
}
