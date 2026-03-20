import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import { PerformanceCreateComponent } from './performance-create';
import { ScheduleService } from '../../services/schedule.service';
import { StageService } from '../../services/stage.service';
import { FestivalService } from '../../services/festival.service';

describe('PerformanceCreateComponent', () => {
  let component: PerformanceCreateComponent;
  let fixture: ComponentFixture<PerformanceCreateComponent>;
  let scheduleService: ScheduleService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PerformanceCreateComponent],
      imports: [CommonModule, ReactiveFormsModule, RouterModule.forRoot([])],
      providers: [
        ScheduleService,
        StageService,
        FestivalService,
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PerformanceCreateComponent);
    component = fixture.componentInstance;
    scheduleService = TestBed.inject(ScheduleService);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('noWhitespaceOnly validator', () => {
    it('is invalid when artistName is only whitespace', () => {
      component.f['artistName'].setValue('   ');
      expect(component.f['artistName'].errors?.['whitespaceOnly']).toBeTruthy();
    });

    it('does not show whitespaceOnly error for empty string (required handles it)', () => {
      component.f['artistName'].setValue('');
      expect(component.f['artistName'].errors?.['whitespaceOnly']).toBeFalsy();
      expect(component.f['artistName'].errors?.['required']).toBeTruthy();
    });

    it('is valid when artistName has non-whitespace content', () => {
      component.f['artistName'].setValue('The Band');
      expect(component.f['artistName'].errors).toBeNull();
    });
  });

  describe('endAfterStart cross-field validator', () => {
    function fillValidForm() {
      component.f['artistName'].setValue('Test Artist');
      component.f['stageName'].setValue('Main Stage');
      component.f['date'].setValue('2026-08-01');
      component.f['startTime'].setValue('18:00');
      component.f['endTime'].setValue('19:00');
    }

    it('is invalid when end time is before start time', () => {
      fillValidForm();
      component.f['endTime'].setValue('17:00');
      expect(component.performanceForm.errors?.['endNotAfterStart']).toBeTruthy();
    });

    it('is invalid when end time equals start time', () => {
      fillValidForm();
      component.f['endTime'].setValue('18:00');
      expect(component.performanceForm.errors?.['endNotAfterStart']).toBeTruthy();
    });

    it('is valid when end time is after start time', () => {
      fillValidForm();
      expect(component.performanceForm.errors).toBeNull();
    });
  });

  describe('onSubmit', () => {
    function fillValidForm() {
      component.f['artistName'].setValue('Test Artist');
      component.f['stageName'].setValue('Main Stage');
      component.f['date'].setValue('2026-08-02');
      component.f['startTime'].setValue('10:00');
      component.f['endTime'].setValue('11:00');
    }

    it('does not call createPerformance when form is invalid', () => {
      const spy = vi.spyOn(scheduleService, 'createPerformance');
      component.onSubmit();
      expect(spy).not.toHaveBeenCalled();
    });

    it('sets serverError when ScheduleService.createPerformance throws', () => {
      fillValidForm();
      vi.spyOn(scheduleService, 'createPerformance').mockImplementation(() => {
        throw new Error('Stage is already booked.');
      });
      component.onSubmit();
      expect(component.serverError).toBe('Stage is already booked.');
    });

    it('sets a generic serverError message when a non-Error is thrown', () => {
      fillValidForm();
      vi.spyOn(scheduleService, 'createPerformance').mockImplementation(() => {
        throw 'unknown error';
      });
      component.onSubmit();
      expect(component.serverError).toBe('An unexpected error occurred.');
    });

    it('calls createPerformance with trimmed artistName on valid submit', () => {
      fillValidForm();
      component.f['artistName'].setValue('  Test Artist  ');
      const spy = vi.spyOn(scheduleService, 'createPerformance').mockReturnValue({
        id: '99',
        festivalId: '1',
        artistName: 'Test Artist',
        stageName: 'Main Stage',
        date: '2026-08-02',
        startTime: '10:00',
        endTime: '11:00',
      });
      component.onSubmit();
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ artistName: 'Test Artist' })
      );
    });
  });
});
