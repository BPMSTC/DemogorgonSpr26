import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ScheduleService } from '../../services/schedule.service';
import { StageService } from '../../services/stage.service';
import { FestivalService } from '../../services/festival.service';
import { Festival } from '../../models/festival.model';
import { Stage } from '../../models/stage.model';

// ---- Genre Options ---------------------------------------------------------

// The list of genres the user can pick when creating a performance.
export const AVAILABLE_GENRES = [
  'Rock',
  'Electronic',
  'Jazz',
  'Hip-Hop',
  'Folk',
  'Pop',
  'Metal',
  'Classical',
  'R&B',
  'World',
];

// ---- Random Placeholder Pool -----------------------------------------------

// Example artist names shown as placeholder text in the artist name field.
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

// Reject values that contain only spaces or tabs — they look filled in but carry no real content.
function validateNoWhitespaceOnly(control: AbstractControl): ValidationErrors | null {
  const inputValue = control.value;
  // Skip non-string values and empty strings — other validators handle those.
  if (typeof inputValue !== 'string') return null;
  if (inputValue.length === 0) return null;
  // Flag the field as invalid if every character is whitespace.
  if (inputValue.trim().length === 0) return { whitespaceOnly: true };
  // Value has real content — no error.
  return null;
}

// Ensure the performance ends after it starts so no backwards time slots can be saved.
function validateEndTimeAfterStartTime(formGroup: AbstractControl): ValidationErrors | null {
  // Read both time values from the form at the same time.
  const startTimeValue = formGroup.get('startTime')?.value as string;
  const endTimeValue = formGroup.get('endTime')?.value as string;
  // Skip validation if either field is still empty.
  if (!startTimeValue || !endTimeValue) return null;
  // Convert a "HH:MM" string into total minutes for easy comparison.
  const parseTimeToMinutes = (t: string): number => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  // Return an error if end time is not strictly after start time.
  return parseTimeToMinutes(endTimeValue) > parseTimeToMinutes(startTimeValue)
    ? null
    : { endNotAfterStart: true };
}

// ---- Component -------------------------------------------------------------

// Handle the form for scheduling a new performance at a specific festival.
@Component({
  selector: 'app-performance-create',
  standalone: false,
  templateUrl: './performance-create.html',
  styleUrl: './performance-create.css',
})
export class PerformanceCreateComponent implements OnInit {
  // Holds the reactive form that collects performance details.
  performanceForm!: FormGroup;
  // Tracks whether the user has pressed Submit at least once, so validation errors can appear.
  hasAttemptedSubmit = false;
  // Holds any error message returned from the backend after a failed save.
  serviceErrorMessage = '';
  // The festival this performance will be added to, loaded for display in the header.
  currentFestival: Festival | undefined;
  // The stages available for this festival, populated so the user can pick one.
  availableStages: Stage[] = [];
  // The festival id taken from the URL so we can scope requests to the right festival.
  festivalId = '';

  // The fixed list of genres the user can choose from.
  readonly availableGenres = AVAILABLE_GENRES;
  // A randomly picked example artist name shown as placeholder text in the input.
  readonly artistNamePlaceholder: string;

  // Inject form building, routing, schedule, stage, and festival services.
  constructor(
    private formBuilder: FormBuilder,
    private activeRoute: ActivatedRoute,
    private router: Router,
    private scheduleService: ScheduleService,
    private stageService: StageService,
    private festivalService: FestivalService,
  ) {
    // Pick a random placeholder from the pool so the field looks more interesting.
    const randomIndex = Math.floor(Math.random() * ARTIST_NAME_PLACEHOLDER_POOL.length);
    this.artistNamePlaceholder = ARTIST_NAME_PLACEHOLDER_POOL[randomIndex];
  }

  ngOnInit(): void {
    // Pull the festival id from the URL so we know where to load data from and where to save.
    this.festivalId = this.activeRoute.snapshot.paramMap.get('id') ?? '';

    // Load festival name for the header.
    this.festivalService.loadById(this.festivalId).subscribe({
      next: (festival) => {
        // Store the festival so the template can show its name.
        this.currentFestival = festival;
      },
      error: () => {
        // Clear the reference if loading fails so the template shows a fallback.
        this.currentFestival = undefined;
      },
    });

    // Load stages for the stage dropdown and load existing performances so
    // the local conflict-detection signal has up-to-date data.
    this.stageService.loadByFestival(this.festivalId).subscribe({
      next: (stages) => {
        // Populate the stage dropdown with the stages belonging to this festival.
        this.availableStages = stages;
      },
      error: () => {
        // Default to an empty list so the dropdown doesn't crash.
        this.availableStages = [];
      },
    });
    this.scheduleService.loadByFestival(this.festivalId).subscribe({
      error: () => {
        // Keep form usable even if preloading performances fails.
      },
    });

    // Build the performance form with field-level and cross-field validators.
    this.performanceForm = this.formBuilder.group(
      {
        artistName: [
          '',
          [Validators.required, validateNoWhitespaceOnly, Validators.maxLength(100)],
        ],
        stageName: ['', Validators.required],
        genre: [''],
        date: ['', Validators.required],
        startTime: ['', Validators.required],
        endTime: ['', Validators.required],
      },
      {
        // Apply the time-order check to the whole form group so it can see both time fields.
        validators: validateEndTimeAfterStartTime,
      },
    );
  }

  // Provide a shortcut to individual form controls so the template can read errors easily.
  get fields() {
    return this.performanceForm.controls;
  }

  onSubmit(): void {
    // Remember that the user tried to submit so validation messages become visible.
    this.hasAttemptedSubmit = true;
    // Clear any previous backend error before trying again.
    this.serviceErrorMessage = '';

    // Stop here if the form still has validation problems.
    if (this.performanceForm.invalid) return;

    // Send the new performance to the backend and navigate to the performance list on success.
    this.scheduleService
      .createPerformance({
        festivalId: this.festivalId,
        // Trim whitespace from the artist name before saving.
        artistName: this.fields['artistName'].value.trim(),
        stageName: this.fields['stageName'].value,
        // Use undefined instead of an empty string when no genre was chosen.
        genre: this.fields['genre'].value || undefined,
        date: this.fields['date'].value,
        startTime: this.fields['startTime'].value,
        endTime: this.fields['endTime'].value,
      })
      .subscribe({
        next: () => this.router.navigate(['/festivals', this.festivalId, 'performances']),
        error: (err: Error) => {
          // Show the backend's error message so the user knows what went wrong.
          this.serviceErrorMessage = err.message ?? 'An unexpected error occurred.';
        },
      });
  }

  onCancel(): void {
    // Discard changes and return the user to the performance list without saving.
    this.router.navigate(['/festivals', this.festivalId, 'performances']);
  }
}
