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

// ---- Custom Validator ------------------------------------------------------

function validatePositiveInteger(control: AbstractControl): ValidationErrors | null {
  const rawValue = control.value;
  if (rawValue === null || rawValue === '') return null;
  const numericValue = Number(rawValue);
  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return { positiveInteger: true };
  }
  return null;
}

// ---- Component -------------------------------------------------------------

@Component({
  selector: 'app-stage-create',
  standalone: false,
  templateUrl: './stage-create.html',
  styleUrl: './stage-create.css',
})
export class StageCreateComponent implements OnInit {
  stageForm!: FormGroup;
  hasAttemptedSubmit = false;
  serviceErrorMessage = '';
  currentFestival: Festival | undefined;
  existingFestivalStages: Stage[] = [];
  festivalId = '';

  readonly STAGE_NAME_OPTIONS = [
    'Main Stage',
    'Indie Stage',
    'Dance Tent',
    'Forest Stage',
    'Side Stage',
    'Acoustic Corner',
    'VIP Lounge',
  ];

  readonly STAGE_STATUS_OPTIONS: { value: StageStatus; label: string }[] = [
    { value: 'active',       label: 'Active' },
    { value: 'inactive',     label: 'Inactive' },
    { value: 'under-repair', label: 'Under Repair' },
  ];

  readonly STAGE_ENVIRONMENT_OPTIONS: { value: StageEnvironment; label: string }[] = [
    { value: 'outdoor', label: 'Outdoor' },
    { value: 'indoor',  label: 'Indoor' },
  ];

  readonly SUGGESTED_CAPACITIES_BY_STAGE_NAME: Record<string, number> = {
    'Main Stage':      5000,
    'Indie Stage':     1500,
    'Dance Tent':       800,
    'Forest Stage':     600,
    'Side Stage':       400,
    'Acoustic Corner':  300,
    'VIP Lounge':       150,
  };

  constructor(
    private formBuilder: FormBuilder,
    private activeRoute: ActivatedRoute,
    private router: Router,
    private stageService: StageService,
    private festivalService: FestivalService
  ) {}

  ngOnInit(): void {
    this.festivalId = this.activeRoute.snapshot.paramMap.get('id') ?? '';

    // Load festival name for the header.
    this.festivalService.load().subscribe(() => {
      this.currentFestival = this.festivalService.getFestivalById(this.festivalId);
    });

    // Load existing stages for duplicate-name checking.
    this.stageService.loadByFestival(this.festivalId).subscribe((stages) => {
      this.existingFestivalStages = stages;
    });

    this.stageForm = this.formBuilder.group({
      name:        ['', Validators.required],
      capacity:    ['', [Validators.required, validatePositiveInteger]],
      environment: ['outdoor', Validators.required],
      status:      ['active',  Validators.required],
      notes:       ['', Validators.maxLength(300)],
    });

    this.stageForm.get('name')!.valueChanges.subscribe((selectedStageName: string) => {
      const suggestedCapacity = this.SUGGESTED_CAPACITIES_BY_STAGE_NAME[selectedStageName];
      if (suggestedCapacity) {
        this.stageForm.get('capacity')!.setValue(suggestedCapacity);
      }
    });
  }

  get fields() {
    return this.stageForm.controls;
  }

  get takenStageNames(): string[] {
    return this.existingFestivalStages.map((s) => s.name.toLowerCase());
  }

  isStageNameAlreadyTaken(name: string): boolean {
    return this.takenStageNames.includes(name.toLowerCase());
  }

  getStatusBadgeClass(stageStatus: StageStatus): string {
    const statusToBadgeClass: Record<StageStatus, string> = {
      'active':       'badge-active',
      'inactive':     'badge-inactive',
      'under-repair': 'badge-repair',
    };
    return statusToBadgeClass[stageStatus];
  }

  onSubmit(): void {
    this.hasAttemptedSubmit  = true;
    this.serviceErrorMessage = '';

    if (this.stageForm.invalid) return;

    const chosenStageName: string = this.fields['name'].value;

    if (this.isStageNameAlreadyTaken(chosenStageName)) {
      this.serviceErrorMessage = `A stage named "${chosenStageName}" already exists for this festival.`;
      return;
    }

    this.stageService.createStage({
      festivalId:  this.festivalId,
      name:        chosenStageName,
      capacity:    Number(this.fields['capacity'].value),
      environment: this.fields['environment'].value,
      status:      this.fields['status'].value,
      notes:       this.fields['notes'].value ?? '',
    }).subscribe({
      next: () => this.router.navigate(['/festivals', this.festivalId, 'stages']),
      error: (err: Error) => {
        this.serviceErrorMessage = err.message ?? 'An unexpected error occurred.';
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/festivals', this.festivalId, 'stages']);
  }
}
