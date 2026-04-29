import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('music-festival-planner');

  private navSub?: Subscription;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Collapse the Bootstrap navbar when navigation completes.
    this.navSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        try {
          const nav = document.getElementById('navbarNav');
          if (nav && nav.classList.contains('show')) {
            nav.classList.remove('show');
          }
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
    this.navSub?.unsubscribe();
  }
}
