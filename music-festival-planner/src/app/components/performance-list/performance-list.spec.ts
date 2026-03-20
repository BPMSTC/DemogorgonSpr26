import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import { PerformanceListComponent } from './performance-list';
import { ScheduleService } from '../../services/schedule.service';
import { FestivalService } from '../../services/festival.service';
import { Performance } from '../../models/performance.model';

describe('PerformanceListComponent', () => {
  let component: PerformanceListComponent;
  let fixture: ComponentFixture<PerformanceListComponent>;
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
    it('calls deletePerformance and reloads list when confirmed', () => {
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
      const deleteSpy = vi.spyOn(scheduleService, 'deletePerformance').mockReturnValue(true);
      const loadSpy = vi.spyOn(component, 'loadPerformances');

      component.deletePerformance('42');

      expect(deleteSpy).toHaveBeenCalledWith('42');
      expect(loadSpy).toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it('does not call deletePerformance when cancelled', () => {
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
      const deleteSpy = vi.spyOn(scheduleService, 'deletePerformance');

      component.deletePerformance('42');

      expect(deleteSpy).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });
  });
});
