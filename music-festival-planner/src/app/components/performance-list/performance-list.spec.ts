import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
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
    imports: [CommonModule],
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
    component.deletePerformance('1');
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
  });
});
