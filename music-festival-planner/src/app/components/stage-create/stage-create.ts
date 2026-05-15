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

// Reject any value that is not a whole number greater than zero.
function validatePositiveInteger(control: AbstractControl): ValidationErrors | null {
  // Treat an empty field as not yet filled in — let the required validator handle that separately.
  const rawValue = control.value;
  if (rawValue === null || rawValue === '') return null;
  // Convert to a number and check that it is a positive whole number.
  const numericValue = Number(rawValue);
  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return { positiveInteger: true };
  }
  // Value is acceptable — no error to report.
  return null;
}

// ---- Component -------------------------------------------------------------

// Handle the form for creating a new stage under a specific festival.
@Component({
  selector: 'app-stage-create',
  standalone: false,
  templateUrl: './stage-create.html',
  styleUrl: './stage-create.css',
})
export class StageCreateComponent implements OnInit {
  // Holds the reactive form that collects stage details.
  stageForm!: FormGroup;
  // Tracks whether the user has pressed Submit at least once, so validation messages can appear.
  hasAttemptedSubmit = false;
  // Holds any error message returned from the backend after a failed save.
  serviceErrorMessage = '';
  // The festival this stage will belong to, loaded so we can show its name in the header.
  currentFestival: Festival | undefined;
  // Stages already saved for this festival, used to prevent duplicate stage names.
  existingFestivalStages: Stage[] = [];
  // The festival id read from the URL so we know which festival to add the stage to.
  festivalId = '';

  // The preset stage name choices shown in the dropdown.
  readonly STAGE_NAME_OPTIONS = [
    'Main Stage',
    'Indie Stage',
    'Dance Tent',
    'Forest Stage',
    'Side Stage',
    'Acoustic Corner',
    'VIP Lounge',
  ];

  // The status choices paired with their human-readable labels.
  readonly STAGE_STATUS_OPTIONS: { value: StageStatus; label: string }[] = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'under-repair', label: 'Under Repair' },
  ];

  // The environment choices paired with their human-readable labels.
  readonly STAGE_ENVIRONMENT_OPTIONS: { value: StageEnvironment; label: string }[] = [
    { value: 'outdoor', label: 'Outdoor' },
    { value: 'indoor', label: 'Indoor' },
  ];

  // Suggested audience capacities pre-filled when the user picks a known stage name.
  readonly SUGGESTED_CAPACITIES_BY_STAGE_NAME: Record<string, number> = {
    'Main Stage': 5000,
    'Indie Stage': 1500,
    'Dance Tent': 800,
    'Forest Stage': 600,
    'Side Stage': 400,
    'Acoustic Corner': 300,
    'VIP Lounge': 150,
  };

  // Inject form building, routing, stage, and festival services needed to build and submit the form.
  constructor(
    private formBuilder: FormBuilder,
    private activeRoute: ActivatedRoute,
    private router: Router,
    private stageService: StageService,
    private festivalService: FestivalService,
  ) {}

  ngOnInit(): void {
    // Pull the festival id from the URL so we can load the right festival and stages.
    this.festivalId = this.activeRoute.snapshot.paramMap.get('id') ?? '';

    // Load festival name for the header.
    this.festivalService.loadById(this.festivalId).subscribe({
      next: (festival) => {
        // Store the festival so the template can display its name.
        this.currentFestival = festival;
      },
      error: () => {
        // Clear the reference if the load fails so the template shows a fallback.
        this.currentFestival = undefined;
      },
    });

    // Load existing stages for duplicate-name checking.
    this.stageService.loadByFestival(this.festivalId).subscribe({
      next: (stages) => {
        // Keep track of existing stage names so we can block duplicates on submit.
        this.existingFestivalStages = stages;
      },
      error: () => {
        // Default to an empty list so the duplicate check doesn't crash.
        this.existingFestivalStages = [];
      },
    });

    // Build the stage form with validation rules for each field.
    this.stageForm = this.formBuilder.group({
      name: ['', Validators.required],
      capacity: ['', [Validators.required, validatePositiveInteger]],
      environment: ['outdoor', Validators.required],
      status: ['active', Validators.required],
      notes: ['', Validators.maxLength(300)],
    });

    // Auto-fill the capacity field when the user picks a known stage name.
    this.stageForm.get('name')!.valueChanges.subscribe((selectedStageName: string) => {
      const suggestedCapacity = this.SUGGESTED_CAPACITIES_BY_STAGE_NAME[selectedStageName];
      if (suggestedCapacity) {
        // Pre-populate capacity with the recommended value for this stage type.
        this.stageForm.get('capacity')!.setValue(suggestedCapacity);
      }
    });
  }

  // Provide a shortcut to individual form controls so the template can read errors easily.
  get fields() {
    return this.stageForm.controls;
  }

  // Returns all existing stage names in lowercase for case-insensitive comparison.
  get takenStageNames(): string[] {
    return this.existingFestivalStages.map((s) => s.name.toLowerCase());
  }

  isStageNameAlreadyTaken(name: string): boolean {
    // Check if the chosen name (case-insensitively) already exists for this festival.
    return this.takenStageNames.includes(name.toLowerCase());
  }

  getStatusBadgeClass(stageStatus: StageStatus): string {
    // Map each status value to the CSS class that colours the badge correctly.
    const statusToBadgeClass: Record<StageStatus, string> = {
      active: 'badge-active',
      inactive: 'badge-inactive',
      'under-repair': 'badge-repair',
    };
    // Return the matching CSS class for the given status.
    return statusToBadgeClass[stageStatus];
  }

  onSubmit(): void {
    // Remember that the user tried to submit so validation messages become visible.
    this.hasAttemptedSubmit = true;
    // Clear any previous backend error before trying again.
    this.serviceErrorMessage = '';

    // Stop here if the form still has validation problems.
    if (this.stageForm.invalid) return;

    // Read the stage name the user selected from the dropdown.
    const chosenStageName: string = this.fields['name'].value;

    // Block the submission if a stage with this name already exists for this festival.
    if (this.isStageNameAlreadyTaken(chosenStageName)) {
      this.serviceErrorMessage = `A stage named "${chosenStageName}" already exists for this festival.`;
      return;
    }

    // Send the new stage to the backend and navigate back to the stage list on success.
    this.stageService
      .createStage({
        festivalId: this.festivalId,
        name: chosenStageName,
        capacity: Number(this.fields['capacity'].value),
        environment: this.fields['environment'].value,
        status: this.fields['status'].value,
        notes: this.fields['notes'].value ?? '',
      })
      .subscribe({
        next: () => this.router.navigate(['/festivals', this.festivalId, 'stages']),
        error: (err: Error) => {
          // Show the backend's error message so the user knows what went wrong.
          this.serviceErrorMessage = err.message ?? 'An unexpected error occurred.';
        },
      });
  }

  onCancel(): void {
    // Discard changes and return the user to the stage list without saving.
    this.router.navigate(['/festivals', this.festivalId, 'stages']);
  }
}
