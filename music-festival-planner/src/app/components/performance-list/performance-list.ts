import { Component, Injector, OnInit, effect } from '@angular/core';
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
  currentFestival: Festival | undefined;
  sortedPerformances: Performance[] = [];
  festivalId = '';

  constructor(
    private activeRoute: ActivatedRoute,
    private router: Router,
    private scheduleService: ScheduleService,
    private festivalService: FestivalService,
    private injector: Injector,
  ) {}

  ngOnInit(): void {
    this.festivalId = this.activeRoute.snapshot.paramMap.get('id') ?? '';

    // Load festival name for the header.
    this.festivalService.load().subscribe({
      next: () => {
        this.currentFestival = this.festivalService.getFestivalById(this.festivalId);
      },
      error: () => {
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
        this.sortedPerformances = this.sortPerformances(
          this.scheduleService.getPerformancesByFestival(this.festivalId),
        );
      },
      { injector: this.injector },
    );
  }

  private sortPerformances(performances: Performance[]): Performance[] {
    const convertTimeToMinutes = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    return [...performances].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return convertTimeToMinutes(a.startTime) - convertTimeToMinutes(b.startTime);
    });
  }

  refreshPerformanceList(): void {
    this.sortedPerformances = this.sortPerformances(
      this.scheduleService.getPerformancesByFestival(this.festivalId),
    );
  }

  formatDisplayTime(timeString: string): string {
    const [hoursText, minutesText] = timeString.split(':');
    const hours = Number(hoursText);
    const minutes = Number(minutesText);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeString;
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const normalizedHours = hours % 12 || 12;
    return `${String(normalizedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
  }

  // ---- Navigation --------------------------------------------------------

  navigateToAddPerformance(): void {
    this.router.navigate(['/festivals', this.festivalId, 'performances', 'new']);
  }

  navigateBackToFestivals(): void {
    this.router.navigate(['/festivals']);
  }

  // ---- Action Handlers ---------------------------------------------------

  confirmAndDeletePerformance(performanceId: string): void {
    if (confirm('Remove this performance from the lineup?')) {
      this.scheduleService.deletePerformance(performanceId).subscribe();
      // The signal update inside deletePerformance() will trigger the effect()
      // which re-sorts sortedPerformances automatically.
    }
  }

  confirmAndClearAllPerformances(): void {
    if (confirm('Clear ALL performances for this festival? This cannot be undone.')) {
      this.scheduleService.clearPerformancesByFestival(this.festivalId).subscribe();
    }
  }
}
