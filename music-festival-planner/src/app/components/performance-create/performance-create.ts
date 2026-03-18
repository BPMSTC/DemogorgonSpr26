import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ScheduleService } from '../../services/schedule.service';
import { StageService } from '../../services/stage.service';
import { FestivalService } from '../../services/festival.service';
import { Festival } from '../../models/festival.model';
import { Stage } from '../../models/stage.model';

/** Custom validator: end time must be later than start time */
function endAfterStart(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startTime')?.value as string;
  const end = group.get('endTime')?.value as string;
  if (!start || !end) return null;
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  return toMin(end) > toMin(start) ? null : { endNotAfterStart: true };
}

@Component({
  selector: 'app-performance-create',
  standalone: false,
  templateUrl: './performance-create.html',
  styleUrl: './performance-create.css',
})
export class PerformanceCreateComponent implements OnInit {
  performanceForm!: FormGroup;
  submitted = false;
  serverError = '';

  festival: Festival | undefined;
  stages: Stage[] = [];
  festivalId = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private scheduleService: ScheduleService,
    private stageService: StageService,
    private festivalService: FestivalService
  ) {}

  ngOnInit(): void {
    this.festivalId = this.route.snapshot.paramMap.get('id') ?? '';
    this.festival = this.festivalService.getFestivalById(this.festivalId);
    this.stages = this.stageService.getStagesByFestival(this.festivalId);

    this.performanceForm = this.fb.group(
      {
        artistName: ['', [Validators.required, Validators.maxLength(100)]],
        stageName:  ['', Validators.required],
        date:       ['', Validators.required],
        startTime:  ['', Validators.required],
        endTime:    ['', Validators.required],
      },
      { validators: endAfterStart }
    );
  }

  get f() {
    return this.performanceForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.serverError = '';

    if (this.performanceForm.invalid) return;

    try {
      this.scheduleService.createPerformance({
        festivalId: this.festivalId,
        artistName: this.f['artistName'].value.trim(),
        stageName:  this.f['stageName'].value,
        date:       this.f['date'].value,
        startTime:  this.f['startTime'].value,
        endTime:    this.f['endTime'].value,
      });

      this.router.navigate(['/festivals', this.festivalId, 'performances']);
    } catch (err: unknown) {
      this.serverError = err instanceof Error ? err.message : 'An unexpected error occurred.';
    }
  }

  onCancel(): void {
    this.router.navigate(['/festivals', this.festivalId, 'performances']);
  }
}
