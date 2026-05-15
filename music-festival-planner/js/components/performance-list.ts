import { Component, Injector, OnInit, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ScheduleService } from '../services/schedule.service';
import { FestivalService } from '../services/festival.service';
import { Festival } from '../models/festival.model';
import { Performance } from '../models/performance.model';

// Show all performances for a festival and let admins add or remove them.
@Component({
  selector: 'app-performance-list',
  standalone: false,
  templateUrl: '../../pages/performance-list.html',
  styleUrl: '../../css/performance-list.css',
})
export class PerformanceListComponent implements OnInit {
  // The festival whose performances are being displayed.
  currentFestival: Festival | undefined;
  // The performances sorted by date and start time for display.
  sortedPerformances: Performance[] = [];
  // The festival id read from the URL so we know which festival to load.
  festivalId = '';

  // Inject routing, schedule, festival, and injector services needed to manage performances.
  constructor(
    private activeRoute: ActivatedRoute,
    private router: Router,
    private scheduleService: ScheduleService,
    private festivalService: FestivalService,
    private injector: Injector,
  ) {}

  ngOnInit(): void {
    // Pull the festival id out of the URL so we know which festival to load.
    this.festivalId = this.activeRoute.snapshot.paramMap.get('id') ?? '';

    // Load festival name for the header.
    this.festivalService.loadById(this.festivalId).subscribe({
      next: (festival) => {
        // Store the festival so the template can display its name.
        this.currentFestival = festival;
      },
      error: () => {
        // Clear the festival reference if loading fails so the template shows a fallback.
        this.currentFestival = undefined;
      },
    });

    // Load performances from the API; the signal update triggers the effect below.
    this.scheduleService.loadByFestival(this.festivalId).subscribe({
      error: () => {
        // keep existing signal state if initial load fails
      },
    });

    // React to signal changes (initial load + any subsequent add/delete).
    effect(
      () => {
        // Re-sort whenever the underlying signal data changes so the list stays up to date.
        this.sortedPerformances = this.sortPerformances(
          this.scheduleService.getPerformancesByFestival(this.festivalId),
        );
      },
      { injector: this.injector },
    );
  }

  private sortPerformances(performances: Performance[]): Performance[] {
    // Convert a time string like "14:30" into a total-minutes number for easy comparison.
    const convertTimeToMinutes = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    // Sort first by date, then by start time within the same day.
    return [...performances].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return convertTimeToMinutes(a.startTime) - convertTimeToMinutes(b.startTime);
    });
  }

  refreshPerformanceList(): void {
    // Re-read from the signal and re-sort so the template shows the latest data.
    this.sortedPerformances = this.sortPerformances(
      this.scheduleService.getPerformancesByFestival(this.festivalId),
    );
  }

  formatDisplayTime(timeString: string): string {
    // Split the time string into its hour and minute parts.
    const [hoursText, minutesText] = timeString.split(':');
    const hours = Number(hoursText);
    const minutes = Number(minutesText);
    // Return the raw string unchanged if either part is not a valid number.
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeString;
    // Determine AM or PM based on the 24-hour value.
    const suffix = hours >= 12 ? 'PM' : 'AM';
    // Convert to 12-hour clock, treating 0 as 12.
    const normalizedHours = hours % 12 || 12;
    // Return the formatted time with zero-padded hour and minutes.
    return `${String(normalizedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
  }

  // ---- Navigation --------------------------------------------------------

  navigateToAddPerformance(): void {
    // Send the user to the form for adding a new performance to this festival.
    this.router.navigate(['/festivals', this.festivalId, 'performances', 'new']);
  }

  navigateBackToFestivals(): void {
    // Return the user to the main festivals listing page.
    this.router.navigate(['/festivals']);
  }

  // ---- Action Handlers ---------------------------------------------------

  confirmAndDeletePerformance(performanceId: string): void {
    // Ask the user to confirm before removing the performance from the lineup.
    if (confirm('Remove this performance from the lineup?')) {
      this.scheduleService.deletePerformance(performanceId).subscribe();
      // The signal update inside deletePerformance() will trigger the effect()
      // which re-sorts sortedPerformances automatically.
    }
  }

  confirmAndClearAllPerformances(): void {
    // Warn the user that clearing all performances is permanent before proceeding.
    if (confirm('Clear ALL performances for this festival? This cannot be undone.')) {
      // Ask the service to remove every performance for this festival at once.
      this.scheduleService.clearPerformancesByFestival(this.festivalId).subscribe();
    }
  }
}
