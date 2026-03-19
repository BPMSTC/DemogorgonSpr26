import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FestivalService } from '../../services/festival.service';
import { Festival } from '../../models/festival.model';

/** Cross-field validator: endDate must be on or after startDate. */
function endDateAfterStart(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value;
  const end = group.get('endDate')?.value;
  if (start && end && end < start) {
    return { endBeforeStart: true };
  }
  return null;
}

@Component({
  selector: 'app-festival-create',
  standalone: false,
  templateUrl: './festival-create.html',
  styleUrl: './festival-create.css'
})
export class FestivalCreateComponent implements OnInit {
  festivalForm!: FormGroup;
  submitted = false;
  serverError = '';

  constructor(
    private fb: FormBuilder,
    private festivalService: FestivalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.festivalForm = this.fb.group({
      name: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      location: ['', Validators.required]
    }, { validators: endDateAfterStart });
  }

  get f() { return this.festivalForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    this.serverError = '';

    if (this.festivalForm.invalid) {
      return;
    }

    try {
      const newFestival: Omit<Festival, 'id'> = this.festivalForm.value;
      this.festivalService.createFestival(newFestival);
      // Route back to the main festivals page after saving
      this.router.navigate(['/festivals']);
    } catch (err: unknown) {
      this.serverError = err instanceof Error ? err.message : 'An unexpected error occurred.';
    }
  }
}