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

  if (startDateValue && endDateValue && endDateValue < startDateValue) {
    return { endBeforeStart: true };
  }

  return null;
}

// ---- Component -------------------------------------------------------------

@Component({
  selector: 'app-festival-create',
  standalone: false,
  templateUrl: './festival-create.html',
  styleUrl: './festival-create.css',
})
export class FestivalCreateComponent implements OnInit {
  festivalForm!: FormGroup;
  hasAttemptedSubmit = false;
  serviceErrorMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private festivalService: FestivalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.festivalForm = this.formBuilder.group(
      {
        name:      ['', Validators.required],
        startDate: ['', Validators.required],
        endDate:   ['', Validators.required],
        location:  ['', Validators.required],
      },
      {
        validators: validateEndDateOnOrAfterStartDate,
      }
    );
  }

  get fields() {
    return this.festivalForm.controls;
  }

  onSubmit(): void {
    this.hasAttemptedSubmit  = true;
    this.serviceErrorMessage = '';

    if (this.festivalForm.invalid) return;

    const newFestivalData = this.festivalForm.value as Omit<Festival, 'id'>;

    this.festivalService.createFestival(newFestivalData).subscribe({
      next: () => this.router.navigate(['/festivals']),
      error: (err: Error) => {
        this.serviceErrorMessage = err.message ?? 'An unexpected error occurred.';
      },
    });
  }
}
