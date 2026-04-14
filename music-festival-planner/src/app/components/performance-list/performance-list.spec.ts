import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import { PerformanceListComponent } from './performance-list';
import { ScheduleService } from '../../services/schedule.service';
import { FestivalService } from '../../services/festival.service';
import { Performance } from '../../models/performance.model';
import { Festival } from '../../models/festival.model';
import { signal } from '@angular/core';
import { Observable, of } from 'rxjs';

const MOCK_FESTIVAL: Festival = {
  id: '1',
  name: 'Neon Horizon Festival',
  startDate: '2026-08-01',
  endDate: '2026-08-03',
  location: 'Riverside Park, Austin TX',
};

const MOCK_PERFORMANCES: Performance[] = [
  {
    id: '1',
    festivalId: '1',
    artistName: 'The Neon Shadows',
    stageName: 'Main Stage',
    date: '2026-08-01',
    startTime: '18:00',
    endTime: '19:30',
  },
  {
    id: '2',
    festivalId: '1',
    artistName: 'Acoustic Wanderers',
    stageName: 'Forest Stage',
    date: '2026-08-02',
    startTime: '14:00',
    endTime: '15:00',
  },
  {
    id: '3',
    festivalId: '1',
    artistName: 'DJ Horizon',
    stageName: 'Dance Tent',
    date: '2026-08-01',
    startTime: '18:00',
    endTime: '19:00',
  },
];

class MockScheduleService {
  private readonly performancesState = signal(MOCK_PERFORMANCES.map((p) => ({ ...p })));

  loadByFestival(_festivalId: string): Observable<Performance[]> {
    return of([]);
  }

  getPerformancesByFestival(festivalId: string): Performance[] {
    return this.performancesState()
      .filter((p) => p.festivalId === festivalId)
      .map((p) => ({ ...p }));
  }

  deletePerformance(id: string): Observable<void> {
    this.performancesState.update((list) => list.filter((p) => p.id !== id));
    return of(void 0);
  }

  clearPerformancesByFestival(festivalId: string): Observable<void> {
    this.performancesState.update((list) => list.filter((p) => p.festivalId !== festivalId));
    return of(void 0);
  }
}

class MockFestivalService {
  load() {
    return of([MOCK_FESTIVAL]);
  }

  getFestivalById(id: string): Festival | undefined {
    return id === '1' ? { ...MOCK_FESTIVAL } : undefined;
  }
}

function makeTestBed(festivalId = '1') {
  return TestBed.configureTestingModule({
    declarations: [PerformanceListComponent],
    imports: [CommonModule, RouterModule.forRoot([])],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: () => festivalId } } },
      },
      { provide: ScheduleService, useClass: MockScheduleService },
      { provide: FestivalService, useClass: MockFestivalService },
    ],
  }).compileComponents();
}

describe('PerformanceListComponent', () => {
  let component: PerformanceListComponent;
  let fixture: ComponentFixture<PerformanceListComponent>;
  let scheduleService: ScheduleService;

  beforeEach(async () => {
    await makeTestBed();
    fixture = TestBed.createComponent(PerformanceListComponent);
    component = fixture.componentInstance;
    scheduleService = TestBed.inject(ScheduleService);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set festivalId from route params on init', () => {
    expect(component.festivalId).toBe('1');
  });

  it('should load the festival on init', () => {
    expect(component.currentFestival).toEqual(MOCK_FESTIVAL);
  });

  it('should load performances for the festival on init', () => {
    expect(component.sortedPerformances.length).toBe(3);
  });

  it('should sort performances by date then by start time', () => {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    for (let i = 1; i < component.sortedPerformances.length; i++) {
      const prev = component.sortedPerformances[i - 1];
      const curr = component.sortedPerformances[i];
      if (prev.date === curr.date) {
        expect(toMin(prev.startTime)).toBeLessThanOrEqual(toMin(curr.startTime));
      } else {
        expect(prev.date.localeCompare(curr.date)).toBeLessThanOrEqual(0);
      }
    }
  });

  it('should reload performances after deletePerformance is called', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const scheduleService = TestBed.inject(ScheduleService);
    const deleteSpy = vi.spyOn(scheduleService, 'deletePerformance');

    component.confirmAndDeletePerformance('1');
    component.refreshPerformanceList();

    expect(deleteSpy).toHaveBeenCalledWith('1');
    expect(component.sortedPerformances.length).toBe(2);
    expect(component.sortedPerformances.find((p) => p.id === '1')).toBeUndefined();
  });
});

describe('PerformanceListComponent — festival not found', () => {
  let component: PerformanceListComponent;
  let fixture: ComponentFixture<PerformanceListComponent>;
  let scheduleService: ScheduleService;

  beforeEach(async () => {
    await makeTestBed('999');
    fixture = TestBed.createComponent(PerformanceListComponent);
    component = fixture.componentInstance;
    scheduleService = TestBed.inject(ScheduleService);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should set festival to undefined for an unknown festival id', () => {
    expect(component.currentFestival).toBeUndefined();
  });

  it('should show an empty performances list for an unknown festival', () => {
    expect(component.sortedPerformances.length).toBe(0);
  });

  describe('refreshPerformanceList sorting', () => {
    it('sorts performances by date then by numeric startTime', () => {
      const mockPerformances: Performance[] = [
        {
          id: '3',
          festivalId: '1',
          artistName: 'C',
          stageName: 'Stage',
          date: '2026-08-02',
          startTime: '9:00',
          endTime: '10:00',
        },
        {
          id: '1',
          festivalId: '1',
          artistName: 'A',
          stageName: 'Stage',
          date: '2026-08-01',
          startTime: '10:00',
          endTime: '11:00',
        },
        {
          id: '2',
          festivalId: '1',
          artistName: 'B',
          stageName: 'Stage',
          date: '2026-08-01',
          startTime: '9:00',
          endTime: '10:00',
        },
      ];
      vi.spyOn(scheduleService, 'getPerformancesByFestival').mockReturnValue(mockPerformances);
      component.refreshPerformanceList();

      expect(component.sortedPerformances[0].id).toBe('2'); // 2026-08-01, 9:00
      expect(component.sortedPerformances[1].id).toBe('1'); // 2026-08-01, 10:00
      expect(component.sortedPerformances[2].id).toBe('3'); // 2026-08-02, 9:00
    });

    it('sorts "9:00" before "10:00" numerically (not lexicographically)', () => {
      const mockPerformances: Performance[] = [
        {
          id: '2',
          festivalId: '1',
          artistName: 'B',
          stageName: 'Stage',
          date: '2026-08-01',
          startTime: '10:00',
          endTime: '11:00',
        },
        {
          id: '1',
          festivalId: '1',
          artistName: 'A',
          stageName: 'Stage',
          date: '2026-08-01',
          startTime: '9:00',
          endTime: '10:00',
        },
      ];
      vi.spyOn(scheduleService, 'getPerformancesByFestival').mockReturnValue(mockPerformances);
      component.refreshPerformanceList();

      expect(component.sortedPerformances[0].startTime).toBe('9:00');
      expect(component.sortedPerformances[1].startTime).toBe('10:00');
    });
  });

  describe('confirmAndDeletePerformance', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('calls deletePerformance and reloads list when confirmed', () => {
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
      const deleteSpy = vi.spyOn(scheduleService, 'deletePerformance');

      component.confirmAndDeletePerformance('42');

      expect(deleteSpy).toHaveBeenCalledWith('42');
    });

    it('does not call deletePerformance when cancelled', () => {
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
      const deleteSpy = vi.spyOn(scheduleService, 'deletePerformance');

      component.confirmAndDeletePerformance('42');

      expect(deleteSpy).not.toHaveBeenCalled();
    });
  });
});
