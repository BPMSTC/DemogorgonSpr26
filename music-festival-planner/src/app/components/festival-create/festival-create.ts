import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FestivalService } from '../../services/festival.service';
import { Festival } from '../../models/festival.model';

@Component({
  selector: 'app-festival-create',
  standalone: false,
  templateUrl: './festival-create.html',
  styleUrl: './festival-create.css'
})
export class FestivalCreateComponent implements OnInit {
  festivalForm!: FormGroup;
  submitted = false;

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
    });
  }

  get f() { return this.festivalForm.controls; }

  onSubmit(): void {
    this.submitted = true;

    if (this.festivalForm.invalid) {
      return;
    }

    const newFestival: Omit<Festival, 'id'> = this.festivalForm.value;
    this.festivalService.createFestival(newFestival);
    
    // Route back to the main festivals page after saving
    this.router.navigate(['/festivals']);
  }
}