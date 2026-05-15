import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';
import { FestivalService } from '../../services/festival.service';
import { StageService } from '../../services/stage.service';
import { PersonalScheduleService } from '../../services/personal-schedule.service';
import { AuthService } from '../../services/auth.service';
import { Festival } from '../../models/festival.model';
import { Stage } from '../../models/stage.model';

// A small shape that carries stage-load results back from the parallel fetch.
type FestivalStageLookup = { id: string; stages: Stage[]; failed: boolean };

// Display the list of all festivals and handle expanding, deleting, and menu interactions.
@Component({
  selector: 'app-festivals',
  standalone: false,
  templateUrl: './festivals.html',
  styleUrl: './festivals.css',
})
export class Festivals implements OnInit, OnDestroy {
  // The full list of festivals fetched from the server.
  festivalsList: Festival[] = [];

  // Returns true when the logged-in user has organizer (admin) privileges.
  get isOrganizerUser(): boolean {
    return this.authService.isAdmin;
  }

  // Tracks which festival card is currently expanded to show extra details.
  expandedFestivalId: string | null = null;

  /** Pre-fetched on init so the template doesn't call the service on every render. */
  // Maps each festival id to its list of stages so the template can look them up without re-fetching.
  stagesByFestivalId: Record<string, Stage[] | undefined> = {};
  // Flags which festivals had their stage load fail, so the template can show a warning.
  stageLoadFailedByFestivalId: Record<string, boolean | undefined> = {};
  // Flags which festivals had their card image fail to load, so we can fall back to a placeholder.
  imageLoadFailedByFestivalId: Record<string, boolean | undefined> = {};

  // Tracks which festival's kebab (three-dot) menu is currently open.
  openKebabMenuFestivalId: string | null = null;

  // Holds the router-events subscription so it can be cleaned up on destroy.
  private routerEventsSubscription?: Subscription;
  // Holds the active data-load subscription so it can be cancelled when a new load starts.
  private loadDataSubscription?: Subscription;
  // Shows a loading indicator while the initial data fetch is in progress.
  isLoading = true;

  // Inject all services needed to load festivals, stages, the schedule, auth, and routing.
  constructor(
    private festivalService: FestivalService,
    private stageService: StageService,
    private personalScheduleService: PersonalScheduleService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  private loadData(): void {
    // Signal to the template that a fresh fetch is underway.
    this.isLoading = true;
    // Cancel any in-flight load before starting a new one.
    this.loadDataSubscription?.unsubscribe();
    this.loadDataSubscription = this.festivalService
      .load()
      .pipe(
        switchMap((festivals) => {
          // Save the festival list and reset all per-festival lookup maps.
          this.festivalsList = festivals;
          this.stagesByFestivalId = {};
          this.stageLoadFailedByFestivalId = {};
          this.imageLoadFailedByFestivalId = {};

          // Initialise each festival's error flags to false before fetching stages.
          festivals.forEach((festival) => {
            this.stageLoadFailedByFestivalId[festival.id] = false;
            this.imageLoadFailedByFestivalId[festival.id] = false;
          });

          // If there are no festivals, skip the stage fetch and return an empty result.
          if (festivals.length === 0) return of([] as FestivalStageLookup[]);
          // Fetch stages for all festivals in parallel, recording any failures without crashing.
          return forkJoin(
            festivals.map((f) =>
              this.stageService.loadByFestival(f.id).pipe(
                switchMap((stages) => of({ id: f.id, stages, failed: false })),
                catchError(() =>
                  of({ id: f.id, stages: [] as Stage[], failed: true }),
                ),
              ),
            ),
          );
        }),
      )
      .subscribe({
        next: (results: FestivalStageLookup[]) => {
          // Store the stage results and failure flags for every festival.
          results.forEach((r) => {
            this.stagesByFestivalId[r.id] = r.stages;
            this.stageLoadFailedByFestivalId[r.id] = r.failed;
          });
          // Data is ready — hide the loading indicator.
          this.isLoading = false;
          this.cdr.detectChanges(); // ensure UI updates after async loads complete
        },
        error: () => {
          // On a top-level failure, clear everything so the template shows an empty state.
          this.festivalsList = [];
          this.stagesByFestivalId = {};
          this.stageLoadFailedByFestivalId = {};
          this.imageLoadFailedByFestivalId = {};
          this.isLoading = false;
          this.cdr.detectChanges(); // ensure UI updates after async loads complete even on failure
        },
      });
  }

  // Returns true when the festival has a usable image URL and the image hasn't broken.
  hasCardImage(festival: Festival): boolean {
    return !!this.getCardImageUrl(festival) && !this.imageLoadFailedByFestivalId[festival.id];
  }

  // Strips whitespace from the image URL and returns null when the URL is empty.
  getCardImageUrl(festival: Festival): string | null {
    const trimmedImageUrl = festival.imageUrl?.trim();
    return trimmedImageUrl ? trimmedImageUrl : null;
  }

  // Mark this festival's image as broken so the template can fall back to a placeholder.
  onCardImageError(festivalId: string): void {
    this.imageLoadFailedByFestivalId[festivalId] = true;
  }

  ngOnInit(): void {
    // Fetch all festivals and their stages as soon as the page loads.
    this.loadData();
    // Keeps stage counts fresh when navigating back from stage/performance pages without a full reload.
    this.routerEventsSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe({
        next: () => {
          // Re-fetch data whenever the user navigates to any page.
          this.loadData();
        },
        error: () => {
          // no-op: router event stream is not expected to error
        },
      });
  }

  ngOnDestroy(): void {
    // Unsubscribe from both streams to prevent memory leaks when the component is removed.
    this.routerEventsSubscription?.unsubscribe();
    this.loadDataSubscription?.unsubscribe();
    //  this.stageLoadSubscriptions.forEach((s) => s.unsubscribe());
  }

  toggleFestivalCard(festivalId: string, clickEvent: MouseEvent): void {
    // Identify which element was actually clicked.
    const clickedElement = clickEvent.target as HTMLElement;
    // Ignore clicks that originate inside the kebab menu — those are handled separately.
    if (clickedElement.closest('.kebab-menu')) return;

    // Check whether the click landed on an interactive element like a link or button.
    const interactiveAncestor = clickedElement.closest('a, button, input, select, textarea');
    // Allow the card-toggle button itself through, but block all other interactive elements.
    const isCardToggleButton = interactiveAncestor?.classList.contains('card-toggle-btn') ?? false;
    if (interactiveAncestor && !isCardToggleButton) return;

    // Collapse the card if it was already open, or expand it if it was closed.
    this.expandedFestivalId = this.expandedFestivalId === festivalId ? null : festivalId;
  }

  toggleFestivalCardOnKeyboard(festivalId: string, keyboardEvent: KeyboardEvent): void {
    // Only act on Enter or Space — ignore all other keys.
    if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return;
    // Identify what element the keyboard event originated from.
    const focusedElement = keyboardEvent.target as HTMLElement;
    // Don't interfere with interactive children (links, buttons, etc.).
    if (focusedElement.closest('a, button, input, select, textarea')) return;
    keyboardEvent.preventDefault(); // prevent Space from scrolling the page
    // Toggle the expanded state just like a mouse click would.
    this.expandedFestivalId = this.expandedFestivalId === festivalId ? null : festivalId;
  }

  toggleKebabMenu(festivalId: string, clickEvent: MouseEvent): void {
    // Stop the click from bubbling up and accidentally toggling the card.
    clickEvent.stopPropagation();
    // Open this menu if it was closed, or close it if it was already open.
    this.openKebabMenuFestivalId = this.openKebabMenuFestivalId === festivalId ? null : festivalId;
  }

  // Returns true when the given festival's kebab menu should be visible.
  isKebabMenuOpen(festivalId: string): boolean {
    return this.openKebabMenuFestivalId === festivalId;
  }

  // Close whatever kebab menu is currently open.
  closeAllKebabMenus(): void {
    this.openKebabMenuFestivalId = null;
  }

  // Map a status string to the CSS class name that styles the badge the right colour.
  getStatusBadgeClass(statusValue: string): string {
    // Look up the CSS class for each known status; fall back to an empty string for unknown values.
    const statusToBadgeClass: Record<string, string> = {
      active: 'badge-active',
      inactive: 'badge-inactive',
      'under-repair': 'badge-repair',
    };
    return statusToBadgeClass[statusValue] ?? '';
  }

  // ---- Cascade Delete ----------------------------------------------------

  /**
   * Deletes a festival via the backend cascade-delete endpoint and refreshes
   * local UI state afterwards.
   */
  deleteFestivalWithCascade(festivalId: string, clickEvent: MouseEvent): void {
    // Stop the click from bubbling up to the card toggle handler.
    clickEvent.stopPropagation();
    // Close any open kebab menus before proceeding.
    this.closeAllKebabMenus();

    // Find the festival so we can include its name in the confirmation message.
    const festivalToDelete = this.festivalsList.find((f) => f.id === festivalId);
    if (!festivalToDelete) return;

    // Build a clear warning that explains exactly what will be deleted.
    const confirmMessage =
      `Are you sure you want to permanently delete "${festivalToDelete.name}"?\n\n` +
      `This will also delete ALL stages and performances associated with it. This action cannot be undone.`;

    // Abort if the user changes their mind on the confirmation dialog.
    if (!window.confirm(confirmMessage)) return;

    // Remove from personal schedule immediately (local-only, no API needed).
    this.personalScheduleService.removePerformancesByFestival(festivalId);

    // API handles cascade delete for nested stages/performances.
    this.festivalService.deleteFestival(festivalId).subscribe({
      next: () => {
        // Refresh the list so the deleted festival disappears from the UI.
        this.loadData();
        // Collapse the card if it happened to be the one we just deleted.
        if (this.expandedFestivalId === festivalId) {
          this.expandedFestivalId = null;
        }
      },
      error: () => {
        // Re-load to ensure UI matches server state even if failure occurred.
        this.loadData();
      },
    });
  }
}
