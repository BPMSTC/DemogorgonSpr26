import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from './services/auth.service';

// The root application shell — hosts the navbar and the router outlet for all pages.
@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  // The application title stored as a signal for potential reactive use in the template.
  protected readonly title = signal('music-festival-planner');

  // Holds the router-events subscription so it can be cleaned up when the app shuts down.
  private navSub?: Subscription;

  // Inject the auth service for navbar login state, and the router to listen for navigation events.
  constructor(
    public authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Collapse the Bootstrap navbar when navigation completes.
    this.navSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        try {
          // Find the collapsible nav element and remove the "show" class to close it.
          const nav = document.getElementById('navbarNav');
          if (nav && nav.classList.contains('show')) {
            nav.classList.remove('show');
          }
          // Update the toggler's aria attribute so screen readers know the menu is closed.
          const toggler = document.querySelector('.navbar-toggler');
          if (toggler) {
            toggler.setAttribute('aria-expanded', 'false');
          }
        } catch (e) {
          // defensive: DOM might not be available in some test environments
        }
      }
    });
  }

  ngOnDestroy(): void {
    // Unsubscribe from router events to avoid leaking memory after the app component is torn down.
    this.navSub?.unsubscribe();
  }

  logout(): void {
    // Clear the user's session via the auth service, then redirect to the home page.
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
