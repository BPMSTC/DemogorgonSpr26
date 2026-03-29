import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FestivalService } from '../../services/festival.service';
import { Festival } from '../../models/festival.model';

// ---- Custom Validator ------------------------------------------------------

/**
 * Cross-field group validator: the festival end date must fall on or after
 * the start date.  Applied to the parent FormGroup so it can read both fields.
 */
function validateEndDateOnOrAfterStartDate(formGroup: AbstractControl): ValidationErrors | null {
  const startDateValue = formGroup.get('startDate')?.value;
  const endDateValue   = formGroup.get('endDate')?.value;

  // Only validate when both dates are filled in; individual Validators.required
  // will flag the empty cases.
  if (startDateValue && endDateValue && endDateValue < startDateValue) {
    return { endBeforeStart: true }; // triggers the cross-field error message
  }

  return null; // dates are valid (or one is still empty)
}

// ---- Component -------------------------------------------------------------

@Component({
  selector: 'app-festival-create',
  standalone: false,
  templateUrl: './festival-create.html',
  styleUrl: './festival-create.css',
})
export class FestivalCreateComponent implements OnInit {
  /** The reactive form group controlling all festival creation fields. */
  festivalForm!: FormGroup;

  /** Tracks whether the user has tried to submit (triggers full error display). */
  hasAttemptedSubmit = false;

  /** Holds any server-side or service-thrown error to display above the form. */
  serviceErrorMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private festivalService: FestivalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Build the form with individual field validators and the cross-field date validator.
    this.festivalForm = this.formBuilder.group(
      {
        name:      ['', Validators.required], // festival display name is mandatory
        startDate: ['', Validators.required], // opening day is mandatory
        endDate:   ['', Validators.required], // closing day is mandatory
        location:  ['', Validators.required], // city or venue is mandatory
      },
      {
        validators: validateEndDateOnOrAfterStartDate, // cross-field check on the group
      }
    );
  }

  /**
   * Shorthand accessor for individual form controls.
   * Used in the template as `fields['name'].errors` etc.
   */
  get fields() {
    return this.festivalForm.controls;
  }

  /** Handles form submission: validates, saves via service, then navigates to the festivals list. */
  onSubmit(): void {
    this.hasAttemptedSubmit  = true;
    this.serviceErrorMessage = '';

    // Abort if any field or the cross-field validator is still failing.
    if (this.festivalForm.invalid) return;

    try {
      // Cast the raw form value to the expected shape (id is assigned by the service).
      const newFestivalData = this.festivalForm.value as Omit<Festival, 'id'>;
      this.festivalService.createFestival(newFestivalData);

      // Navigate back to the festivals list after a successful save.
      this.router.navigate(['/festivals']);
    } catch (submissionError: unknown) {
      // Surface any service-level validation errors (e.g. date range) in the banner.
      this.serviceErrorMessage =
        submissionError instanceof Error
          ? submissionError.message
          : 'An unexpected error occurred.';
    }
  }
}
