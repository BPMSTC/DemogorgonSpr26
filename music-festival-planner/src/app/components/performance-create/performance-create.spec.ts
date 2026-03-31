import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import { PerformanceCreateComponent } from './performance-create';
import { ScheduleService } from '../../services/schedule.service';
import { StageService } from '../../services/stage.service';
import { FestivalService } from '../../services/festival.service';
import { Performance } from '../../models/performance.model';
import { Stage } from '../../models/stage.model';
import { Festival } from '../../models/festival.model';

const MOCK_FESTIVAL: Festival = {
  id: '1',
  name: 'Neon Horizon Festival',
  startDate: '2026-08-01',
  endDate: '2026-08-03',
  location: 'Riverside Park, Austin TX',
};

const MOCK_STAGES: Stage[] = [
  { id: '1', festivalId: '1', name: 'Main Stage',  capacity: 5000, environment: 'outdoor', status: 'active' },
  { id: '2', festivalId: '1', name: 'Dance Tent',  capacity: 800,  environment: 'indoor',  status: 'active' },
];

class MockScheduleService {
  createPerformance(data: Omit<Performance, 'id'>): Performance {
    return { id: '99', ...data };
  }
}

class MockStageService {
  getStagesByFestival(festivalId: string): Stage[] {
    return festivalId === '1' ? MOCK_STAGES.map((s) => ({ ...s })) : [];
  }
}

class MockFestivalService {
  getFestivalById(id: string): Festival | undefined {
    return id === '1' ? { ...MOCK_FESTIVAL } : undefined;
  }
}

function makeTestBed(festivalId = '1') {
  return TestBed.configureTestingModule({
    declarations: [PerformanceCreateComponent],
    imports: [CommonModule, ReactiveFormsModule, RouterModule.forRoot([])],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: () => festivalId } } },
      },
      { provide: ScheduleService, useClass: MockScheduleService },
      { provide: StageService, useClass: MockStageService },
      { provide: FestivalService, useClass: MockFestivalService },
    ],
  }).compileComponents();
}

describe('PerformanceCreateComponent', () => {
  let component: PerformanceCreateComponent;
  let fixture: ComponentFixture<PerformanceCreateComponent>;
  let scheduleService: ScheduleService;
  let router: Router;

  beforeEach(async () => {
    await makeTestBed();
    fixture = TestBed.createComponent(PerformanceCreateComponent);
    component = fixture.componentInstance;
    scheduleService = TestBed.inject(ScheduleService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set festivalId and load festival and stages on init', () => {
    expect(component.festivalId).toBe('1');
    expect(component.festival).toEqual(MOCK_FESTIVAL);
    expect(component.stages.length).toBe(2);
  });

  it('should initialise the form with empty fields', () => {
    expect(component.performanceForm).toBeTruthy();
    expect(component.f['artistName'].value).toBe('');
    expect(component.f['stageName'].value).toBe('');
    expect(component.f['date'].value).toBe('');
    expect(component.f['startTime'].value).toBe('');
    expect(component.f['endTime'].value).toBe('');
  });

  it('should be invalid when the form is empty', () => {
    expect(component.performanceForm.invalid).toBe(true);
  });

  it('should be valid when all required fields are filled correctly', () => {
    component.performanceForm.setValue({
      artistName: 'Test Artist',
      stageName: 'Main Stage',
      date: '2026-09-15',
      startTime: '14:00',
      endTime: '15:30',
    });
    expect(component.performanceForm.valid).toBe(true);
  });

  it('should fail validation when artistName is whitespace only', () => {
    component.performanceForm.setValue({
      artistName: '   ',
      stageName: 'Main Stage',
      date: '2026-09-15',
      startTime: '14:00',
      endTime: '15:30',
    });
    expect(component.f['artistName'].errors?.['whitespaceOnly']).toBeTruthy();
  });

  it('should reject artist names longer than 100 characters', () => {
    component.f['artistName'].setValue('A'.repeat(101));
    expect(component.f['artistName'].errors?.['maxlength']).toBeTruthy();
  });

  it('should fail cross-field validation when endTime is before startTime', () => {
    component.performanceForm.setValue({
      artistName: 'Test Artist',
      stageName: 'Main Stage',
      date: '2026-09-15',
      startTime: '16:00',
      endTime: '15:00',
    });
    expect(component.performanceForm.errors?.['endNotAfterStart']).toBeTruthy();
  });

  it('should fail cross-field validation when endTime equals startTime', () => {
    component.performanceForm.setValue({
      artistName: 'Test Artist',
      stageName: 'Main Stage',
      date: '2026-09-15',
      startTime: '14:00',
      endTime: '14:00',
    });
    expect(component.performanceForm.errors?.['endNotAfterStart']).toBeTruthy();
  });

  it('should not submit when the form is invalid', () => {
    const scheduleService = TestBed.inject(ScheduleService);
    const createSpy = vi.spyOn(scheduleService, 'createPerformance');

    component.onSubmit();

    expect(createSpy).not.toHaveBeenCalled();
  });

  it('should call scheduleService.createPerformance with correct data on valid submit', () => {
    const scheduleService = TestBed.inject(ScheduleService);
    const createSpy = vi.spyOn(scheduleService, 'createPerformance').mockReturnValue({
      id: '99',
      festivalId: '1',
      artistName: 'Test Artist',
      stageName: 'Main Stage',
      date: '2026-09-15',
      startTime: '14:00',
      endTime: '15:30',
    });

    component.performanceForm.setValue({
      artistName: 'Test Artist',
      stageName: 'Main Stage',
      date: '2026-09-15',
      startTime: '14:00',
      endTime: '15:30',
    });

    component.onSubmit();

    expect(createSpy).toHaveBeenCalledWith({
      festivalId: '1',
      artistName: 'Test Artist',
      stageName: 'Main Stage',
      date: '2026-09-15',
      startTime: '14:00',
      endTime: '15:30',
    });
  });

  it('should trim whitespace from artistName before submitting', () => {
    const scheduleService = TestBed.inject(ScheduleService);
    const createSpy = vi.spyOn(scheduleService, 'createPerformance').mockReturnValue({
      id: '99',
      festivalId: '1',
      artistName: 'Test Artist',
      stageName: 'Main Stage',
      date: '2026-09-15',
      startTime: '14:00',
      endTime: '15:30',
    });

    component.performanceForm.setValue({
      artistName: '  Test Artist  ',
      stageName: 'Main Stage',
      date: '2026-09-15',
      startTime: '14:00',
      endTime: '15:30',
    });

    component.onSubmit();

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ artistName: 'Test Artist' })
    );
  });

  it('should set serverError when createPerformance throws a conflict error', () => {
    const scheduleService = TestBed.inject(ScheduleService);
    vi.spyOn(scheduleService, 'createPerformance').mockImplementation(() => {
      throw new Error('"Main Stage" is already booked during that time slot.');
    });

    component.performanceForm.setValue({
      artistName: 'Test Artist',
      stageName: 'Main Stage',
      date: '2026-09-15',
      startTime: '14:00',
      endTime: '15:30',
    });

    component.onSubmit();

    expect(component.serverError).toContain('already booked');
  });

  it('should navigate to the performances list on successful submit', () => {
    const scheduleService = TestBed.inject(ScheduleService);
    vi.spyOn(scheduleService, 'createPerformance').mockReturnValue({
      id: '99',
      festivalId: '1',
      artistName: 'Test Artist',
      stageName: 'Main Stage',
      date: '2026-09-15',
      startTime: '14:00',
      endTime: '15:30',
    });
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.performanceForm.setValue({
      artistName: 'Test Artist',
      stageName: 'Main Stage',
      date: '2026-09-15',
      startTime: '14:00',
      endTime: '15:30',
    });

    component.onSubmit();

    expect(navigateSpy).toHaveBeenCalledWith(['/festivals', '1', 'performances']);
  });
});

describe('PerformanceCreateComponent — no stages', () => {
  let component: PerformanceCreateComponent;
  let fixture: ComponentFixture<PerformanceCreateComponent>;
  let scheduleService: ScheduleService;
  let router: Router;

  beforeEach(async () => {
    await makeTestBed('999');
    fixture = TestBed.createComponent(PerformanceCreateComponent);
    component = fixture.componentInstance;
    scheduleService = TestBed.inject(ScheduleService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should show an empty stages list for a festival with no stages', () => {
    expect(component.stages.length).toBe(0);
  });

  it('should set festival to undefined for an unknown festival id', () => {
    expect(component.festival).toBeUndefined();
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
      vi.spyOn(router, 'navigate').mockResolvedValue(true);
      component.onSubmit();
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ artistName: 'Test Artist' })
      );
    });
  });
});
