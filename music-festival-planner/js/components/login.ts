import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Handle the login form — building it, validating it, and sending credentials to the auth service.
@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: '../../pages/login.html',
  styleUrl: '../../css/login.css',
})
export class LoginComponent implements OnInit {
  // Holds the reactive form that collects the user's email and password.
  form!: FormGroup;
  // Stores any login error message to display below the form.
  errorMessage = '';
  // Prevents the user from submitting the form twice while a request is in flight.
  isLoading = false;
  // Controls whether the password field shows plain text or dots.
  showPassword = false;

  // Inject the form builder, auth service, and router used to log the user in and redirect them.
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // If the user is already logged in, send them straight to the home page.
    if (this.authService.isLoggedIn) {
      this.router.navigate(['/']);
      return;
    }
    // Build the login form with email format validation and a minimum password length.
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  onSubmit(): void {
    // Do nothing if the form has errors or a login request is already running.
    if (this.form.invalid || this.isLoading) return;
    // Clear any previous error message before trying again.
    this.errorMessage = '';
    // Lock the form to stop duplicate submissions while waiting for the server.
    this.isLoading = true;

    // Pull the credentials the user typed into the form.
    const { email, password } = this.form.value;
    // Send the credentials to the auth service and handle the outcome.
    this.authService.login(email, password).subscribe({
      next: () => {
        // Send admins to the admin dashboard and everyone else to the festivals list.
        const destination = this.authService.isAdmin ? '/admin' : '/festivals';
        this.router.navigate([destination]);
      },
      error: (err: Error) => {
        // Show the error from the server and re-enable the form so the user can try again.
        this.errorMessage = err.message;
        this.isLoading = false;
      },
    });
  }
}
