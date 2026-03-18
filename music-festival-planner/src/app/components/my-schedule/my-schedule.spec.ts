import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MySchedule, ALL_STAGES } from './my-schedule';
import { ScheduleService } from '../../services/schedule.service';
import { Performance } from '../../models/performance.model';

const MOCK_PERFORMANCES: Performance[] = [
  { id: '1', festivalId: '1', artistName: 'The Neon Shadows', stageName: 'Main Stage',   date: '2026-08-01', startTime: '18:00', endTime: '19:30' },
  { id: '2', festivalId: '1', artistName: 'DJ Horizon',       stageName: 'Dance Tent',   date: '2026-08-01', startTime: '18:00', endTime: '19:00' },
  { id: '3', festivalId: '1', artistName: 'Electric Pulse',   stageName: 'Main Stage',   date: '2026-08-01', startTime: '20:00', endTime: '21:30' },
  { id: '4', festivalId: '1', artistName: 'Acoustic Wanderers', stageName: 'Forest Stage', date: '2026-08-02', startTime: '14:00', endTime: '15:00' },
];

class MockScheduleService {
  getPerformancesByFestival(festivalId: string): Performance[] {
    return MOCK_PERFORMANCES.filter(p => p.festivalId === festivalId).map(p => ({ ...p }));
  }
}

function makeTestBed(festivalId = '1') {
  return TestBed.configureTestingModule({
    declarations: [MySchedule],
    imports: [CommonModule],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: () => festivalId } } }
      },
      { provide: ScheduleService, useClass: MockScheduleService }
    ]
  }).compileComponents();
}

describe('MySchedule', () => {
  let component: MySchedule;
  let fixture: ComponentFixture<MySchedule>;

  beforeEach(async () => {
    await makeTestBed();
    fixture = TestBed.createComponent(MySchedule);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('day grouping', () => {
    it('extracts unique festival days sorted ascending', () => {
      expect(component.festivalDays).toEqual(['2026-08-01', '2026-08-02']);
    });

    it('auto-selects the first day on init', () => {
      expect(component.selectedDay).toBe('2026-08-01');
    });

    it('shows performances for the selected day', () => {
      expect(component.filteredPerformances.length).toBe(3);
      component.filteredPerformances.forEach(p => expect(p.date).toBe('2026-08-01'));
    });

    it('switches to a different day when selectDay is called', () => {
      component.selectDay('2026-08-02');
      expect(component.selectedDay).toBe('2026-08-02');
      expect(component.filteredPerformances.length).toBe(1);
      expect(component.filteredPerformances[0].artistName).toBe('Acoustic Wanderers');
    });

    it('resets stage filter to All Stages when changing day', () => {
      component.selectStage('Main Stage');
      expect(component.selectedStage).toBe('Main Stage');
      component.selectDay('2026-08-02');
      expect(component.selectedStage).toBe(ALL_STAGES);
    });
  });

  describe('stage filter', () => {
    it('populates allStagesForDay with all stages for the selected day', () => {
      expect(component.allStagesForDay).toEqual(['Dance Tent', 'Main Stage']);
    });

    it('starts with All Stages selected', () => {
      expect(component.selectedStage).toBe(ALL_STAGES);
    });

    it('filters performances to the selected stage', () => {
      component.selectStage('Main Stage');
      expect(component.filteredPerformances.length).toBe(2);
      component.filteredPerformances.forEach(p => expect(p.stageName).toBe('Main Stage'));
    });

    it('shows all performances when All Stages is selected', () => {
      component.selectStage('Main Stage');
      component.selectStage(ALL_STAGES);
      expect(component.filteredPerformances.length).toBe(3);
    });

    it('filteredPerformances is empty when no performances exist for a stage on that day', () => {
      component.selectStage('Forest Stage');
      expect(component.filteredPerformances.length).toBe(0);
    });
  });

  describe('timetable grid', () => {
    it('builds performanceGrid keys from startTime and stageName', () => {
      component.selectStage(ALL_STAGES);
      expect(component.performanceGrid['18:00-Main Stage']?.artistName).toBe('The Neon Shadows');
      expect(component.performanceGrid['18:00-Dance Tent']?.artistName).toBe('DJ Horizon');
    });

    it('stages list only contains stages with performances after filtering', () => {
      component.selectStage('Main Stage');
      expect(component.stages).toEqual(['Main Stage']);
    });

    it('times list contains unique start times after filtering', () => {
      component.selectStage('Main Stage');
      expect(component.times).toEqual(['18:00', '20:00']);
    });
  });

  describe('empty state', () => {
    it('filteredPerformances is empty when stage filter matches nothing', () => {
      component.selectDay('2026-08-01');
      component.selectStage('Forest Stage');
      expect(component.filteredPerformances.length).toBe(0);
    });
  });
});

describe('MySchedule — festival with no performances', () => {
  let component: MySchedule;
  let fixture: ComponentFixture<MySchedule>;

  beforeEach(async () => {
    await makeTestBed('999');
    fixture = TestBed.createComponent(MySchedule);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('filteredPerformances is empty for a festival with no performances', () => {
    expect(component.filteredPerformances.length).toBe(0);
    expect(component.festivalDays.length).toBe(0);
  });
});
