import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StageService } from '../../services/stage.service';
import { FestivalService } from '../../services/festival.service';
import { Festival } from '../../models/festival.model';
import { Stage, StageEnvironment, StageStatus } from '../../models/stage.model';

/** Custom validator: capacity must be a positive integer */
function positiveInteger(control: AbstractControl): ValidationErrors | null {
  const val = control.value;
  if (val === null || val === '') return null; // let required handle empty
  const num = Number(val);
  if (!Number.isInteger(num) || num <= 0) {
    return { positiveInteger: true };
  }
  return null;
}

@Component({
  selector: 'app-stage-create',
  standalone: false,
  templateUrl: './stage-create.html',
  styleUrl: './stage-create.css',
})
export class StageCreateComponent implements OnInit {
  stageForm!: FormGroup;
  submitted = false;
  serverError = '';

  festival: Festival | undefined;
  existingStages: Stage[] = [];
  festivalId = '';

  readonly STAGE_NAMES = [
    'Main Stage',
    'Indie Stage',
    'Dance Tent',
    'Forest Stage',
    'Side Stage',
    'Acoustic Corner',
    'VIP Lounge',
  ];

  readonly STATUS_OPTIONS: { value: StageStatus; label: string }[] = [
    { value: 'active',       label: 'Active' },
    { value: 'inactive',     label: 'Inactive' },
    { value: 'under-repair', label: 'Under Repair' },
  ];

  readonly ENVIRONMENT_OPTIONS: { value: StageEnvironment; label: string }[] = [
    { value: 'outdoor', label: 'Outdoor' },
    { value: 'indoor',  label: 'Indoor' },
  ];

  /** Capacities shown as hints per well-known stage name */
  readonly CAPACITY_HINTS: Record<string, number> = {
    'Main Stage':       5000,
    'Indie Stage':      1500,
    'Dance Tent':        800,
    'Forest Stage':      600,
    'Side Stage':        400,
    'Acoustic Corner':   300,
    'VIP Lounge':        150,
  };

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private stageService: StageService,
    private festivalService: FestivalService
  ) {}

  ngOnInit(): void {
    this.festivalId = this.route.snapshot.paramMap.get('id') ?? '';
    this.festival = this.festivalService.getFestivalById(this.festivalId);
    this.existingStages = this.stageService.getStagesByFestival(this.festivalId);

    this.stageForm = this.fb.group({
      name:        ['', Validators.required],
      capacity:    ['', [Validators.required, positiveInteger]],
      environment: ['outdoor', Validators.required],
      status:      ['active',  Validators.required],
      notes:       ['', Validators.maxLength(300)],
    });

    // Auto-fill capacity hint when stage name changes
    this.stageForm.get('name')!.valueChanges.subscribe((name: string) => {
      if (this.CAPACITY_HINTS[name]) {
        this.stageForm.get('capacity')!.setValue(this.CAPACITY_HINTS[name]);
      }
    });
  }

  get f() {
    return this.stageForm.controls;
  }

  /** Names already used by this festival — prevent duplicates */
  get takenNames(): string[] {
    return this.existingStages.map((s) => s.name.toLowerCase());
  }

  isNameTaken(name: string): boolean {
    return this.takenNames.includes(name.toLowerCase());
  }

  getStatusBadgeClass(status: StageStatus): string {
    return {
      active:        'badge-active',
      inactive:      'badge-inactive',
      'under-repair':'badge-repair',
    }[status];
  }

  onSubmit(): void {
    this.submitted = true;
    this.serverError = '';

    if (this.stageForm.invalid) return;

    const selectedName: string = this.f['name'].value;
    if (this.isNameTaken(selectedName)) {
      this.serverError = `A stage named "${selectedName}" already exists for this festival.`;
      return;
    }

    try {
      this.stageService.createStage({
        festivalId:  this.festivalId,
        name:        selectedName,
        capacity:    Number(this.f['capacity'].value),
        environment: this.f['environment'].value,
        status:      this.f['status'].value,
        notes:       this.f['notes'].value ?? '',
      });

      this.router.navigate(['/festivals', this.festivalId, 'stages']);
    } catch (err: any) {
      this.serverError = err.message ?? 'An unexpected error occurred.';
    }
  }

  onCancel(): void {
    this.router.navigate(['/festivals', this.festivalId, 'stages']);
  }
}