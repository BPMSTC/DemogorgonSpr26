import { Component, Injector, OnInit, OnDestroy, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ScheduleService } from '../../services/schedule.service';
import { FestivalService } from '../../services/festival.service';
import {
  PersonalScheduleService,
  PersonalConflict,
} from '../../services/personal-schedule.service';
import { Performance } from '../../models/performance.model';

// ---- Filter Sentinels ------------------------------------------------------

export const ALL_STAGES = 'All Stages';
export const ALL_GENRES = 'All Genres';

// ---- Types -----------------------------------------------------------------

export interface ConflictInfo {
  time: string;
  stage: string;
  artists: string[];
  ids: string[];
}

export type ActiveView = 'festival' | 'personal';

// ---- Component -------------------------------------------------------------

@Component({
  selector: 'app-my-schedule',
  standalone: false,
  templateUrl: './my-schedule.html',
  styleUrl: './my-schedule.css',
})
export class MySchedule implements OnInit, OnDestroy {
  activeView: ActiveView = 'festival';

  festivalId: string = '';
  festivalName: string = '';
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
  performanceGrid: Record<string, Performance | undefined> = {};

  conflicts: ConflictInfo[] = [];

  savedPerformances: Performance[] = [];
  savedIds: Set<string> = new Set();
  personalConflicts: PersonalConflict[] = [];
  personalDays: string[] = [];
  festivalNameById: Record<string, string> = {};
  removingId: string | null = null;

  private savedSub?: Subscription;

  readonly ALL_STAGES_CONST = ALL_STAGES;
  readonly ALL_GENRES_CONST = ALL_GENRES;

  constructor(
    private route: ActivatedRoute,
    private scheduleService: ScheduleService,
    private injector: Injector,
    private festivalService: FestivalService,
    public personalSchedule: PersonalScheduleService,
  ) {}

  ngOnInit(): void {
    this.festivalId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.festivalId) {
      this.activeView = 'personal';
    }

    // Load all festivals so the name-lookup map is populated.
    this.festivalService.load().subscribe({
      next: (festivals) => {
        this.festivalNameById = festivals.reduce(
          (lookup, f) => {
            lookup[f.id] = f.name;
            return lookup;
          },
          {} as Record<string, string>,
        );
        this.festivalName = this.festivalId
          ? (festivals.find((f) => f.id === this.festivalId)?.name ?? '')
          : '';
      },
      error: () => {
        this.festivalNameById = {};
        this.festivalName = '';
      },
    });

    if (this.festivalId) {
      // Fetch performances from the API; the signal update fires the effect below.
      this.scheduleService.loadByFestival(this.festivalId).subscribe({
        error: () => {
          this.allPerformances = [];
          this.syncViewStateFromStore();
        },
      });

      effect(
        () => {
          this.allPerformances = this.scheduleService.getPerformancesByFestival(this.festivalId);
          this.syncViewStateFromStore();
        },
        { injector: this.injector },
      );
    }

    this.savedSub = this.personalSchedule.saved$.subscribe((saved) => {
      this.savedPerformances = saved;
      this.savedIds = new Set(saved.map((p) => p.id));
      this.personalConflicts = this.personalSchedule.getPersonalConflicts();
      this.personalDays = [...new Set(saved.map((p) => p.date))].sort();
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
    this.selectedDay = day;
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

    if (!this.selectedDay || !this.festivalDays.includes(this.selectedDay)) {
      this.selectedDay = this.festivalDays[0];
      this.selectedStage = ALL_STAGES;
      this.selectedGenre = ALL_GENRES;
    }

    this.refreshFilterOptionsForSelectedDay();

    if (this.selectedStage !== ALL_STAGES && !this.allStagesForDay.includes(this.selectedStage)) {
      this.selectedStage = ALL_STAGES;
    }
    if (this.selectedGenre !== ALL_GENRES && !this.allGenresForDay.includes(this.selectedGenre)) {
      this.selectedGenre = ALL_GENRES;
    }

    this.applyFilters();
  }

  private refreshFilterOptionsForSelectedDay(): void {
    const dayPerfs = this.allPerformances.filter((p) => p.date === this.selectedDay);
    this.allStagesForDay = [...new Set(dayPerfs.map((p) => p.stageName))].sort();
    this.allGenresForDay = [
      ...new Set(dayPerfs.map((p) => p.genre).filter((g): g is string => !!g)),
    ].sort();
  }

  // ---- Personal Schedule Actions -----------------------------------------

  toggleSaved(perf: Performance, event: Event): void {
    event.stopPropagation();
    this.personalSchedule.toggle(perf);
  }

  removeSaved(perfId: string, event: Event): void {
    event.stopPropagation();
    this.personalSchedule.remove(perfId);
  }

  clearPersonalSchedule(): void {
    if (this.savedPerformances.length === 0) return;
    this.personalSchedule.clearAll();
  }

  savedForDay(date: string): Performance[] {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    return this.savedPerformances
      .filter((p) => p.date === date)
      .sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
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

  hasPersonalConflict(perfId: string): boolean {
    return this.personalConflicts.some((c) => c.a.id === perfId || c.b.id === perfId);
  }

  festivalLabelForPerformance(perf: Performance): string {
    return this.festivalNameById[perf.festivalId] ?? 'Festival';
  }

  // ---- Private View-Building Logic --------------------------------------

  private applyFilters(): void {
    let dayPerfs = this.allPerformances.filter((p) => p.date === this.selectedDay);

    if (this.selectedStage !== ALL_STAGES) {
      dayPerfs = dayPerfs.filter((p) => p.stageName === this.selectedStage);
    }
    if (this.selectedGenre !== ALL_GENRES) {
      dayPerfs = dayPerfs.filter((p) => p.genre === this.selectedGenre);
    }

    this.filteredPerformances = dayPerfs;
    this.stages = [...new Set(this.filteredPerformances.map((p) => p.stageName))].sort();

    const timeToMinutes = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    this.times = [...new Set(this.filteredPerformances.map((p) => p.startTime))].sort(
      (a, b) => timeToMinutes(a) - timeToMinutes(b),
    );

    this.performanceGrid = {};
    for (const perf of this.filteredPerformances) {
      this.performanceGrid[`${perf.startTime}-${perf.stageName}`] = perf;
    }

    this.detectConflicts();
  }

  private detectConflicts(): void {
    const allDayPerfs = this.allPerformances.filter((p) => p.date === this.selectedDay);

    const byStage: Record<string, Performance[]> = {};
    for (const perf of allDayPerfs) {
      if (!byStage[perf.stageName]) byStage[perf.stageName] = [];
      byStage[perf.stageName].push(perf);
    }

    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const toTimeStr = (m: number) =>
      `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

    const found: ConflictInfo[] = [];

    for (const [stage, perfs] of Object.entries(byStage)) {
      for (let i = 0; i < perfs.length; i++) {
        for (let j = i + 1; j < perfs.length; j++) {
          const a = perfs[i];
          const b = perfs[j];
          const overlap =
            toMin(a.startTime) < toMin(b.endTime) && toMin(a.endTime) > toMin(b.startTime);
          if (overlap) {
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

    this.conflicts = found;
  }

  hasConflict(time: string, stage: string): boolean {
    const perf = this.performanceGrid[`${time}-${stage}`];
    if (!perf) return false;
    return this.conflicts.some((c) => c.stage === stage && c.ids.includes(perf.id));
  }
}
