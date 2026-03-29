import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ScheduleService } from '../../services/schedule.service';
import { StageService } from '../../services/stage.service';
import { FestivalService } from '../../services/festival.service';
import { Festival } from '../../models/festival.model';
import { Stage } from '../../models/stage.model';

// ---- Genre Options ---------------------------------------------------------

/**
 * Available music genre choices shown in the genre dropdown.
 * Exported so tests or other components can reference the same list.
 */
export const AVAILABLE_GENRES = [
  'Rock', 'Electronic', 'Jazz', 'Hip-Hop', 'Folk',
  'Pop', 'Metal', 'Classical', 'R&B', 'World',
];

// ---- Random Placeholder Pool -----------------------------------------------

/**
 * A pool of example artist names randomly shown as input placeholder text.
 * Rotates on every form load to make the UI feel more alive and give users
 * inspiration for what kind of entries to enter.
 */
const ARTIST_NAME_PLACEHOLDER_POOL = [
  'e.g. The Neon Shadows',
  'e.g. Solar Drift',
  'e.g. Midnight Frequency',
  'e.g. Echo Collective',
  'e.g. Velvet Riot',
  'e.g. Static Bloom',
  'e.g. The Desert Wolves',
  'e.g. Indigo Signal',
];

// ---- Custom Validators -----------------------------------------------------

/**
 * Rejects strings that contain only whitespace characters (spaces, tabs, etc.)
 * while still allowing the built-in `Validators.required` to handle the
 * truly-empty case.  Prevents entries like "   " from passing validation.
 */
function validateNoWhitespaceOnly(control: AbstractControl): ValidationErrors | null {
  const inputValue = control.value;

  if (typeof inputValue !== 'string') return null;
  if (inputValue.length === 0) return null; // let Validators.required handle empty strings

  // Non-empty but entirely whitespace → flag as invalid.
  if (inputValue.trim().length === 0) {
    return { whitespaceOnly: true };
  }

  return null; // value is acceptable
}

/**
 * Cross-field group validator: ensures the end time is strictly later
 * than the start time.  Applied to the parent FormGroup, not a single control.
 */
function validateEndTimeAfterStartTime(formGroup: AbstractControl): ValidationErrors | null {
  const startTimeValue = formGroup.get('startTime')?.value as string;
  const endTimeValue   = formGroup.get('endTime')?.value as string;

  // Skip if either field is still empty (Validators.required handles that).
  if (!startTimeValue || !endTimeValue) return null;

  // Convert "HH:mm" → total minutes to allow a numeric comparison.
  const parseTimeToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const endIsAfterStart =
    parseTimeToMinutes(endTimeValue) > parseTimeToMinutes(startTimeValue);

  return endIsAfterStart ? null : { endNotAfterStart: true };
}

// ---- Component -------------------------------------------------------------

@Component({
  selector: 'app-performance-create',
  standalone: false,
  templateUrl: './performance-create.html',
  styleUrl: './performance-create.css',
})
export class PerformanceCreateComponent implements OnInit {
  /** The reactive form group that manages all field state and validation. */
  performanceForm!: FormGroup;

  /** Tracks whether the user has attempted to submit (enables "show all errors" mode). */
  hasAttemptedSubmit = false;

  /** Holds any error message returned by the service (e.g. double-booking). */
  serviceErrorMessage = '';

  /** The festival this performance will be added to (loaded from route param). */
  currentFestival: Festival | undefined;

  /** All stages available for this festival, populated from StageService. */
  availableStages: Stage[] = [];

  /** Festival ID extracted from the URL (:id route param). */
  festivalId = '';

  /** Genre options shown in the genre dropdown. */
  readonly availableGenres = AVAILABLE_GENRES;

  /**
   * A randomly selected placeholder string for the artist name input.
   * Chosen once per component instance (i.e. once per form load) from the pool.
   */
  readonly artistNamePlaceholder: string;

  constructor(
    private formBuilder: FormBuilder,
    private activeRoute: ActivatedRoute,
    private router: Router,
    private scheduleService: ScheduleService,
    private stageService: StageService,
    private festivalService: FestivalService
  ) {
    // Pick a random placeholder from the pool at construction time.
    const randomIndex = Math.floor(Math.random() * ARTIST_NAME_PLACEHOLDER_POOL.length);
    this.artistNamePlaceholder = ARTIST_NAME_PLACEHOLDER_POOL[randomIndex];
  }

  ngOnInit(): void {
    // Pull the festival ID from the URL so we know which festival's stages to load.
    this.festivalId = this.activeRoute.snapshot.paramMap.get('id') ?? '';

    // Load the parent festival record (used to show the festival name in the header).
    this.currentFestival = this.festivalService.getFestivalById(this.festivalId);

    // Load the stages available for this festival to populate the stage dropdown.
    this.availableStages = this.stageService.getStagesByFestival(this.festivalId);

    // Build the reactive form with field-level and cross-field validators.
    this.performanceForm = this.formBuilder.group(
      {
        artistName: [
          '',
          [
            Validators.required,          // field must not be empty
            validateNoWhitespaceOnly,      // field must not be all spaces
            Validators.maxLength(100),     // cap at 100 characters
          ],
        ],
        stageName: ['', Validators.required],  // must select a stage
        genre:     [''],                       // optional — no validator needed
        date:      ['', Validators.required],  // must pick a date
        startTime: ['', Validators.required],  // must enter a start time
        endTime:   ['', Validators.required],  // must enter an end time
      },
      {
        // Cross-field validator applied to the group: end must be after start.
        validators: validateEndTimeAfterStartTime,
      }
    );
  }

  /**
   * Shorthand accessor for individual form controls.
   * Used in the template as `fields['artistName'].errors` etc.
   */
  get fields() {
    return this.performanceForm.controls;
  }

  /** Handles form submission: validates, saves via service, then navigates away. */
  onSubmit(): void {
    this.hasAttemptedSubmit   = true;
    this.serviceErrorMessage  = '';

    // Stop here if any field-level or cross-field validator failed.
    if (this.performanceForm.invalid) return;

    try {
      // Pass all field values to the service which handles conflict detection.
      this.scheduleService.createPerformance({
        festivalId: this.festivalId,
        artistName: this.fields['artistName'].value.trim(), // trim trailing spaces
        stageName:  this.fields['stageName'].value,
        genre:      this.fields['genre'].value || undefined, // omit if blank
        date:       this.fields['date'].value,
        startTime:  this.fields['startTime'].value,
        endTime:    this.fields['endTime'].value,
      });

      // On success, go back to the performance list for this festival.
      this.router.navigate(['/festivals', this.festivalId, 'performances']);
    } catch (submissionError: unknown) {
      // The service throws human-readable errors (e.g. double-booking).
      // Display them in the error banner above the form.
      this.serviceErrorMessage =
        submissionError instanceof Error
          ? submissionError.message
          : 'An unexpected error occurred.';
    }
  }

  /** Navigates back to the performance list without saving anything. */
  onCancel(): void {
    this.router.navigate(['/festivals', this.festivalId, 'performances']);
  }
}
