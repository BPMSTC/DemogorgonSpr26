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

function validateNoWhitespaceOnly(control: AbstractControl): ValidationErrors | null {
  const inputValue = control.value;
  if (typeof inputValue !== 'string') return null;
  if (inputValue.length === 0) return null;
  if (inputValue.trim().length === 0) return { whitespaceOnly: true };
  return null;
}

function validateEndTimeAfterStartTime(formGroup: AbstractControl): ValidationErrors | null {
  const startTimeValue = formGroup.get('startTime')?.value as string;
  const endTimeValue = formGroup.get('endTime')?.value as string;
  if (!startTimeValue || !endTimeValue) return null;
  const parseTimeToMinutes = (t: string): number => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  return parseTimeToMinutes(endTimeValue) > parseTimeToMinutes(startTimeValue)
    ? null
    : { endNotAfterStart: true };
}

// ---- Component -------------------------------------------------------------

@Component({
  selector: 'app-performance-create',
  standalone: false,
  templateUrl: './performance-create.html',
  styleUrl: './performance-create.css',
})
export class PerformanceCreateComponent implements OnInit {
  performanceForm!: FormGroup;
  hasAttemptedSubmit = false;
  serviceErrorMessage = '';
  currentFestival: Festival | undefined;
  availableStages: Stage[] = [];
  festivalId = '';

  readonly availableGenres = AVAILABLE_GENRES;
  readonly artistNamePlaceholder: string;

  constructor(
    private formBuilder: FormBuilder,
    private activeRoute: ActivatedRoute,
    private router: Router,
    private scheduleService: ScheduleService,
    private stageService: StageService,
    private festivalService: FestivalService,
  ) {
    const randomIndex = Math.floor(Math.random() * ARTIST_NAME_PLACEHOLDER_POOL.length);
    this.artistNamePlaceholder = ARTIST_NAME_PLACEHOLDER_POOL[randomIndex];
  }

  ngOnInit(): void {
    this.festivalId = this.activeRoute.snapshot.paramMap.get('id') ?? '';

    // Load festival name for the header.
    this.festivalService.loadById(this.festivalId).subscribe({
      next: (festival) => {
        this.currentFestival = festival;
      },
      error: () => {
        this.currentFestival = undefined;
      },
    });

    // Load stages for the stage dropdown and load existing performances so
    // the local conflict-detection signal has up-to-date data.
    this.stageService.loadByFestival(this.festivalId).subscribe({
      next: (stages) => {
        this.availableStages = stages;
      },
      error: () => {
        this.availableStages = [];
      },
    });
    this.scheduleService.loadByFestival(this.festivalId).subscribe({
      error: () => {
        // Keep form usable even if preloading performances fails.
      },
    });

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
        validators: validateEndTimeAfterStartTime,
      },
    );
  }

  get fields() {
    return this.performanceForm.controls;
  }

  onSubmit(): void {
    this.hasAttemptedSubmit = true;
    this.serviceErrorMessage = '';

    if (this.performanceForm.invalid) return;

    this.scheduleService
      .createPerformance({
        festivalId: this.festivalId,
        artistName: this.fields['artistName'].value.trim(),
        stageName: this.fields['stageName'].value,
        genre: this.fields['genre'].value || undefined,
        date: this.fields['date'].value,
        startTime: this.fields['startTime'].value,
        endTime: this.fields['endTime'].value,
      })
      .subscribe({
        next: () => this.router.navigate(['/festivals', this.festivalId, 'performances']),
        error: (err: Error) => {
          this.serviceErrorMessage = err.message ?? 'An unexpected error occurred.';
        },
      });
  }

  onCancel(): void {
    this.router.navigate(['/festivals', this.festivalId, 'performances']);
  }
}
