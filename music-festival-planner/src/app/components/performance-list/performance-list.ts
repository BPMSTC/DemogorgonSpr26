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
  festival: Festival | undefined;
  performances: Performance[] = [];
  festivalId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private scheduleService: ScheduleService,
    private festivalService: FestivalService
  ) {}

  ngOnInit(): void {
    this.festivalId = this.route.snapshot.paramMap.get('id') ?? '';
    this.festival = this.festivalService.getFestivalById(this.festivalId);
    this.loadPerformances();
  }

  loadPerformances(): void {
    const toMinutes = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    this.performances = this.scheduleService
      .getPerformancesByFestival(this.festivalId)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return toMinutes(a.startTime) - toMinutes(b.startTime);
      });
  }

  addPerformance(): void {
    this.router.navigate(['/festivals', this.festivalId, 'performances', 'new']);
  }

  deletePerformance(id: string): void {
    if (confirm('Remove this performance from the lineup?')) {
      this.scheduleService.deletePerformance(id);
      this.loadPerformances();
    }
  }

  clearAll(): void {
    if (confirm('Clear ALL performances for this festival? This cannot be undone.')) {
      this.scheduleService.clearPerformancesByFestival(this.festivalId);
      this.loadPerformances();
    }
  }

  goBack(): void {
    this.router.navigate(['/festivals']);
  }
}
