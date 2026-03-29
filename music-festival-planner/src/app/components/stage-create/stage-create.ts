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

/**
 * Validates that a numeric input is a positive whole number.
 * Decimals (e.g. 1.5) and zero are rejected.  Empty values are allowed here
 * so that Validators.required can provide the "field required" message instead.
 */
function validatePositiveInteger(control: AbstractControl): ValidationErrors | null {
  const rawValue = control.value;

  // Let Validators.required handle empty/null — don't double-report.
  if (rawValue === null || rawValue === '') return null;

  const numericValue = Number(rawValue);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return { positiveInteger: true }; // triggers the "must be a positive whole number" message
  }

  return null; // value is valid
}

// ---- Component -------------------------------------------------------------

@Component({
  selector: 'app-stage-create',
  standalone: false,
  templateUrl: './stage-create.html',
  styleUrl: './stage-create.css',
})
export class StageCreateComponent implements OnInit {
  /** The reactive form group controlling all stage creation fields. */
  stageForm!: FormGroup;

  /** Tracks whether the user has attempted to submit (enables full error display mode). */
  hasAttemptedSubmit = false;

  /** Holds any server-side or service-thrown error message displayed above the form. */
  serviceErrorMessage = '';

  /** The parent festival record (used to show festival name in the header). */
  currentFestival: Festival | undefined;

  /** All stages already added to this festival (used to warn about duplicates). */
  existingFestivalStages: Stage[] = [];

  /** Festival ID extracted from the URL (:id route param). */
  festivalId = '';

  // ---- Dropdown / Radio Option Data ----

  /**
   * Curated list of stage names shown in the name dropdown.
   * Using a fixed list ensures naming consistency across the app.
   */
  readonly STAGE_NAME_OPTIONS = [
    'Main Stage',
    'Indie Stage',
    'Dance Tent',
    'Forest Stage',
    'Side Stage',
    'Acoustic Corner',
    'VIP Lounge',
  ];

  /** Labeled options for the "Status" select dropdown. */
  readonly STAGE_STATUS_OPTIONS: { value: StageStatus; label: string }[] = [
    { value: 'active',       label: 'Active' },
    { value: 'inactive',     label: 'Inactive' },
    { value: 'under-repair', label: 'Under Repair' },
  ];

  /** Labeled options for the "Environment" radio buttons. */
  readonly STAGE_ENVIRONMENT_OPTIONS: { value: StageEnvironment; label: string }[] = [
    { value: 'outdoor', label: 'Outdoor' },
    { value: 'indoor',  label: 'Indoor' },
  ];

  /**
   * Suggested capacity values keyed by well-known stage names.
   * When the user selects a stage name the capacity field is auto-filled
   * with the typical size for that stage type.
   */
  readonly SUGGESTED_CAPACITIES_BY_STAGE_NAME: Record<string, number> = {
    'Main Stage':       5000,
    'Indie Stage':      1500,
    'Dance Tent':        800,
    'Forest Stage':      600,
    'Side Stage':        400,
    'Acoustic Corner':   300,
    'VIP Lounge':        150,
  };

  constructor(
    private formBuilder: FormBuilder,
    private activeRoute: ActivatedRoute,
    private router: Router,
    private stageService: StageService,
    private festivalService: FestivalService
  ) {}

  ngOnInit(): void {
    // Read the festival ID from the URL and load related data.
    this.festivalId = this.activeRoute.snapshot.paramMap.get('id') ?? '';
    this.currentFestival         = this.festivalService.getFestivalById(this.festivalId);
    this.existingFestivalStages  = this.stageService.getStagesByFestival(this.festivalId);

    // Initialize the form with default values and validators.
    this.stageForm = this.formBuilder.group({
      name:        ['', Validators.required],
      capacity:    ['', [Validators.required, validatePositiveInteger]],
      environment: ['outdoor', Validators.required], // sensible default
      status:      ['active',  Validators.required], // new stages start active
      notes:       ['', Validators.maxLength(300)],  // optional, capped at 300 chars
    });

    // When the user picks a stage name, auto-fill the capacity field with
    // the suggested value for that stage type (user can still edit it).
    this.stageForm.get('name')!.valueChanges.subscribe((selectedStageName: string) => {
      const suggestedCapacity = this.SUGGESTED_CAPACITIES_BY_STAGE_NAME[selectedStageName];
      if (suggestedCapacity) {
        this.stageForm.get('capacity')!.setValue(suggestedCapacity);
      }
    });
  }

  /**
   * Shorthand accessor for individual form controls.
   * Used in the template as `fields['name'].errors` etc.
   */
  get fields() {
    return this.stageForm.controls;
  }

  /**
   * Computed list of stage names already in use (lowercase) for fast duplicate checks.
   * Compared case-insensitively to prevent "Main Stage" and "main stage" coexisting.
   */
  get takenStageNames(): string[] {
    return this.existingFestivalStages.map((stage) => stage.name.toLowerCase());
  }

  /** Returns true if the given name is already used by another stage in this festival. */
  isStageNameAlreadyTaken(candidateName: string): boolean {
    return this.takenStageNames.includes(candidateName.toLowerCase());
  }

  /**
   * Maps a StageStatus to its CSS badge class name for inline status indicators.
   */
  getStatusBadgeClass(stageStatus: StageStatus): string {
    const statusToBadgeClass: Record<StageStatus, string> = {
      'active':        'badge-active',
      'inactive':      'badge-inactive',
      'under-repair':  'badge-repair',
    };
    return statusToBadgeClass[stageStatus];
  }

  /** Handles form submission: validates, saves via service, then navigates to the stage list. */
  onSubmit(): void {
    this.hasAttemptedSubmit  = true;
    this.serviceErrorMessage = '';

    // Abort if any validator is still failing.
    if (this.stageForm.invalid) return;

    const chosenStageName: string = this.fields['name'].value;

    // Double-check for duplicate names (the dropdown disables taken options,
    // but this guard protects against any edge case where the form is submitted anyway).
    if (this.isStageNameAlreadyTaken(chosenStageName)) {
      this.serviceErrorMessage = `A stage named "${chosenStageName}" already exists for this festival.`;
      return;
    }

    try {
      this.stageService.createStage({
        festivalId:  this.festivalId,
        name:        chosenStageName,
        capacity:    Number(this.fields['capacity'].value),
        environment: this.fields['environment'].value,
        status:      this.fields['status'].value,
        notes:       this.fields['notes'].value ?? '',
      });

      // Navigate to the stage list after a successful save.
      this.router.navigate(['/festivals', this.festivalId, 'stages']);
    } catch (submissionError: unknown) {
      this.serviceErrorMessage =
        submissionError instanceof Error
          ? submissionError.message
          : 'An unexpected error occurred.';
    }
  }

  /** Navigates back to the stage list without saving. */
  onCancel(): void {
    this.router.navigate(['/festivals', this.festivalId, 'stages']);
  }
}
