import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import { PerformanceListComponent } from './performance-list';
import { ScheduleService } from '../../services/schedule.service';
import { FestivalService } from '../../services/festival.service';
import { Performance } from '../../models/performance.model';
import { Festival } from '../../models/festival.model';

const MOCK_FESTIVAL: Festival = {
  id: '1',
  name: 'Neon Horizon Festival',
  startDate: '2026-08-01',
  endDate: '2026-08-03',
  location: 'Riverside Park, Austin TX',
};

const MOCK_PERFORMANCES: Performance[] = [
  { id: '1', festivalId: '1', artistName: 'The Neon Shadows',   stageName: 'Main Stage',   date: '2026-08-01', startTime: '18:00', endTime: '19:30' },
  { id: '2', festivalId: '1', artistName: 'Acoustic Wanderers', stageName: 'Forest Stage', date: '2026-08-02', startTime: '14:00', endTime: '15:00' },
  { id: '3', festivalId: '1', artistName: 'DJ Horizon',         stageName: 'Dance Tent',   date: '2026-08-01', startTime: '18:00', endTime: '19:00' },
];

class MockScheduleService {
  private performances = MOCK_PERFORMANCES.map((p) => ({ ...p }));

  getPerformancesByFestival(festivalId: string): Performance[] {
    return this.performances.filter((p) => p.festivalId === festivalId).map((p) => ({ ...p }));
  }

  deletePerformance(id: string): boolean {
    const index = this.performances.findIndex((p) => p.id === id);
    if (index === -1) return false;
    this.performances.splice(index, 1);
    return true;
  }
}

class MockFestivalService {
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

  beforeEach(async () => {
    await makeTestBed();
    fixture = TestBed.createComponent(PerformanceListComponent);
    component = fixture.componentInstance;
  let scheduleService: ScheduleService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PerformanceListComponent],
      imports: [CommonModule, RouterModule.forRoot([])],
      providers: [
        ScheduleService,
        FestivalService,
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } } },
        },
      ],
    }).compileComponents();

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
    expect(component.festival).toEqual(MOCK_FESTIVAL);
  });

  it('should load performances for the festival on init', () => {
    expect(component.performances.length).toBe(3);
  });

  it('should sort performances by date then by start time', () => {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    for (let i = 1; i < component.performances.length; i++) {
      const prev = component.performances[i - 1];
      const curr = component.performances[i];
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

    component.deletePerformance('1');

    expect(deleteSpy).toHaveBeenCalledWith('1');
    expect(component.performances.length).toBe(2);
    expect(component.performances.find((p) => p.id === '1')).toBeUndefined();
  });
});

describe('PerformanceListComponent — festival not found', () => {
  let component: PerformanceListComponent;
  let fixture: ComponentFixture<PerformanceListComponent>;

  beforeEach(async () => {
    await makeTestBed('999');
    fixture = TestBed.createComponent(PerformanceListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should set festival to undefined for an unknown festival id', () => {
    expect(component.festival).toBeUndefined();
  });

  it('should show an empty performances list for an unknown festival', () => {
    expect(component.performances.length).toBe(0);
  describe('loadPerformances sorting', () => {
    it('sorts performances by date then by numeric startTime', () => {
      const mockPerformances: Performance[] = [
        { id: '3', festivalId: '1', artistName: 'C', stageName: 'Stage', date: '2026-08-02', startTime: '9:00', endTime: '10:00' },
        { id: '1', festivalId: '1', artistName: 'A', stageName: 'Stage', date: '2026-08-01', startTime: '10:00', endTime: '11:00' },
        { id: '2', festivalId: '1', artistName: 'B', stageName: 'Stage', date: '2026-08-01', startTime: '9:00', endTime: '10:00' },
      ];
      vi.spyOn(scheduleService, 'getPerformancesByFestival').mockReturnValue(mockPerformances);
      component.loadPerformances();

      expect(component.performances[0].id).toBe('2'); // 2026-08-01, 9:00
      expect(component.performances[1].id).toBe('1'); // 2026-08-01, 10:00
      expect(component.performances[2].id).toBe('3'); // 2026-08-02, 9:00
    });

    it('sorts "9:00" before "10:00" numerically (not lexicographically)', () => {
      const mockPerformances: Performance[] = [
        { id: '2', festivalId: '1', artistName: 'B', stageName: 'Stage', date: '2026-08-01', startTime: '10:00', endTime: '11:00' },
        { id: '1', festivalId: '1', artistName: 'A', stageName: 'Stage', date: '2026-08-01', startTime: '9:00', endTime: '10:00' },
      ];
      vi.spyOn(scheduleService, 'getPerformancesByFestival').mockReturnValue(mockPerformances);
      component.loadPerformances();

      expect(component.performances[0].startTime).toBe('9:00');
      expect(component.performances[1].startTime).toBe('10:00');
    });
  });

  describe('deletePerformance', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('calls deletePerformance and reloads list when confirmed', () => {
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
      const deleteSpy = vi.spyOn(scheduleService, 'deletePerformance').mockReturnValue(true);
      const loadSpy = vi.spyOn(component, 'loadPerformances');

      component.deletePerformance('42');

      expect(deleteSpy).toHaveBeenCalledWith('42');
      expect(loadSpy).toHaveBeenCalled();
    });

    it('does not call deletePerformance when cancelled', () => {
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
      const deleteSpy = vi.spyOn(scheduleService, 'deletePerformance');

      component.deletePerformance('42');

      expect(deleteSpy).not.toHaveBeenCalled();
    });
  });
});
