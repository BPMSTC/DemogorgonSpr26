import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FestivalService } from '../services/festival.service';
import { Festival } from '../models/festival.model';

// ---- Custom Validator ------------------------------------------------------

/**
 * Cross-field group validator: the festival end date must fall on or after
 * the start date.  Applied to the parent FormGroup so it can read both fields.
 */
function validateEndDateOnOrAfterStartDate(formGroup: AbstractControl): ValidationErrors | null {
  // Read both date values from the form at the same time.
  const startDateValue = formGroup.get('startDate')?.value;
  const endDateValue   = formGroup.get('endDate')?.value;

  // If the end date comes before the start date, signal a validation failure.
  if (startDateValue && endDateValue && endDateValue < startDateValue) {
    return { endBeforeStart: true };
  }

  // Both dates are acceptable — no error to report.
  return null;
}

// ---- Component -------------------------------------------------------------

// Set up the create-festival form page.
@Component({
  selector: 'app-festival-create',
  standalone: false,
  templateUrl: '../../pages/festival-create.html',
  styleUrl: '../../css/festival-create.css',
})
export class FestivalCreateComponent implements OnInit {
  // Holds the reactive form that collects festival details.
  festivalForm!: FormGroup;
  // Tracks whether the user has pressed Submit at least once, so we know when to show validation errors.
  hasAttemptedSubmit = false;
  // Holds any error message returned from the backend after a failed save.
  serviceErrorMessage = '';

  // Inject the form builder, festival service, and router needed to build and submit the form.
  constructor(
    private formBuilder: FormBuilder,
    private festivalService: FestivalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Build the festival form with required fields and attach the cross-field date validator.
    this.festivalForm = this.formBuilder.group(
      {
        name:      ['', Validators.required],
        startDate: ['', Validators.required],
        endDate:   ['', Validators.required],
        location:  ['', Validators.required],
      },
      {
        // Apply the date-order check to the whole form group so it can see both date fields.
        validators: validateEndDateOnOrAfterStartDate,
      }
    );
  }

  // Provide a shortcut to individual form controls so the template can read errors easily.
  get fields() {
    return this.festivalForm.controls;
  }

  onSubmit(): void {
    // Remember that the user tried to submit so validation messages become visible.
    this.hasAttemptedSubmit  = true;
    // Clear any previous backend error before trying again.
    this.serviceErrorMessage = '';

    // Stop here if the form still has validation problems.
    if (this.festivalForm.invalid) return;

    // Pull the form values into an object shaped like a new festival (without an id).
    const newFestivalData = this.festivalForm.value as Omit<Festival, 'id'>;

    // Send the new festival to the backend and redirect to the festivals list on success.
    this.festivalService.createFestival(newFestivalData).subscribe({
      next: () => this.router.navigate(['/festivals']),
      error: (err: Error) => {
        // Show the backend's error message so the user knows what went wrong.
        this.serviceErrorMessage = err.message ?? 'An unexpected error occurred.';
      },
    });
  }
}
