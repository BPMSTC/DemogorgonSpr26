import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ScheduleService } from '../../services/schedule.service';
import { Performance } from '../../models/performance.model';

export const ALL_STAGES = 'All Stages';
export const ALL_GENRES = 'All Genres';

export interface ConflictInfo {
  time: string;
  stage: string;
  artists: string[];
  ids: string[];
}

@Component({
  selector: 'app-my-schedule',
  standalone: false,
  templateUrl: './my-schedule.html',
  styleUrl: './my-schedule.css',
})
export class MySchedule implements OnInit {
  festivalId: string = '';
  allPerformances: Performance[] = [];

  festivalDays: string[] = [];
  selectedDay: string = '';

  allStagesForDay: string[] = [];
  selectedStage: string = ALL_STAGES;
  readonly ALL_STAGES = ALL_STAGES;

  allGenresForDay: string[] = [];
  selectedGenre: string = ALL_GENRES;
  readonly ALL_GENRES = ALL_GENRES;

  stages: string[] = [];
  times: string[] = [];
  filteredPerformances: Performance[] = [];

  // Dictionary for lightning-fast template lookups — key: "HH:mm-Stage Name"
  performanceGrid: Record<string, Performance | undefined> = {};

  // Conflict detection
  conflicts: ConflictInfo[] = [];

  constructor(
    private route: ActivatedRoute,
    private scheduleService: ScheduleService
  ) {}

  ngOnInit(): void {
    this.festivalId = this.route.snapshot.paramMap.get('id') ?? '1';
    this.allPerformances = this.scheduleService.getPerformancesByFestival(this.festivalId);

    this.festivalDays = [...new Set(this.allPerformances.map(p => p.date))].sort();

    if (this.festivalDays.length > 0) {
      this.selectDay(this.festivalDays[0]);
    }
  }

  selectDay(day: string): void {
    this.selectedDay = day;
    this.selectedStage = ALL_STAGES;
    this.selectedGenre = ALL_GENRES;

    const dayPerformances = this.allPerformances.filter(p => p.date === day);
    this.allStagesForDay = [...new Set(dayPerformances.map(p => p.stageName))].sort();
    this.allGenresForDay = [...new Set(dayPerformances.map(p => p.genre).filter((g): g is string => !!g))].sort();

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

    // Build grid lookup
    this.performanceGrid = {};
    for (const perf of this.filteredPerformances) {
      const gridKey = `${perf.startTime}-${perf.stageName}`;
      this.performanceGrid[gridKey] = perf;
    }

    this.detectConflicts();
  }

  private detectConflicts(): void {
    // Group by stage and find overlapping time slots on the selected day
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
          const a = perfs[i], b = perfs[j];
          const overlap = toMin(a.startTime) < toMin(b.endTime) && toMin(a.endTime) > toMin(b.startTime);
          if (overlap) {
            const overlapStart = Math.max(toMin(a.startTime), toMin(b.startTime));
            const overlapEnd   = Math.min(toMin(a.endTime),   toMin(b.endTime));
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

    this.conflicts = found;
  }

  hasConflict(time: string, stage: string): boolean {
    const perf = this.performanceGrid[`${time}-${stage}`];
    if (!perf) return false;
    return this.conflicts.some(c => c.stage === stage && c.ids.includes(perf.id));
  }
}
