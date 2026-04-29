import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';
import { FestivalService } from '../../services/festival.service';
import { StageService } from '../../services/stage.service';
import { PersonalScheduleService } from '../../services/personal-schedule.service';
import { AuthService } from '../../services/auth.service';
import { Festival } from '../../models/festival.model';
import { Stage } from '../../models/stage.model';

type FestivalStageLookup = { id: string; stages: Stage[]; failed: boolean };

@Component({
  selector: 'app-festivals',
  standalone: false,
  templateUrl: './festivals.html',
  styleUrl: './festivals.css',
})
export class Festivals implements OnInit, OnDestroy {
  festivalsList: Festival[] = [];

  get isOrganizerUser(): boolean {
    return this.authService.isAdmin;
  }

  expandedFestivalId: string | null = null;

  /** Pre-fetched on init so the template doesn't call the service on every render. */
  stagesByFestivalId: Record<string, Stage[] | undefined> = {};
  stageLoadFailedByFestivalId: Record<string, boolean | undefined> = {};
  imageLoadFailedByFestivalId: Record<string, boolean | undefined> = {};

  openKebabMenuFestivalId: string | null = null;

  private routerEventsSubscription?: Subscription;
  private loadDataSubscription?: Subscription;

  constructor(
    private festivalService: FestivalService,
    private stageService: StageService,
    private personalScheduleService: PersonalScheduleService,
    private authService: AuthService,
    private router: Router,
  ) {}

  private loadData(): void {
    this.loadDataSubscription?.unsubscribe();
    this.loadDataSubscription = this.festivalService
      .load()
      .pipe(
        switchMap((festivals) => {
          this.festivalsList = festivals;
          this.stagesByFestivalId = {};
          this.stageLoadFailedByFestivalId = {};
          this.imageLoadFailedByFestivalId = {};

          festivals.forEach((festival) => {
            this.stageLoadFailedByFestivalId[festival.id] = false;
            this.imageLoadFailedByFestivalId[festival.id] = false;
          });

          if (festivals.length === 0) return of([] as FestivalStageLookup[]);
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
          results.forEach((r) => {
            this.stagesByFestivalId[r.id] = r.stages;
            this.stageLoadFailedByFestivalId[r.id] = r.failed;
          });
        },
        error: () => {
          this.festivalsList = [];
          this.stagesByFestivalId = {};
          this.stageLoadFailedByFestivalId = {};
          this.imageLoadFailedByFestivalId = {};
        },
      });
  }

  hasCardImage(festival: Festival): boolean {
    return !!this.getCardImageUrl(festival) && !this.imageLoadFailedByFestivalId[festival.id];
  }

  getCardImageUrl(festival: Festival): string | null {
    const trimmedImageUrl = festival.imageUrl?.trim();
    return trimmedImageUrl ? trimmedImageUrl : null;
  }

  onCardImageError(festivalId: string): void {
    this.imageLoadFailedByFestivalId[festivalId] = true;
  }

  ngOnInit(): void {
    this.loadData();
    // Keeps stage counts fresh when navigating back from stage/performance pages without a full reload.
    this.routerEventsSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe({
        next: () => {
          this.loadData();
        },
        error: () => {
          // no-op: router event stream is not expected to error
        },
      });
  }

  ngOnDestroy(): void {
    this.routerEventsSubscription?.unsubscribe();
    this.loadDataSubscription?.unsubscribe();
    //  this.stageLoadSubscriptions.forEach((s) => s.unsubscribe());
  }

  toggleFestivalCard(festivalId: string, clickEvent: MouseEvent): void {
    const clickedElement = clickEvent.target as HTMLElement;
    if (clickedElement.closest('.kebab-menu')) return;
    this.expandedFestivalId = this.expandedFestivalId === festivalId ? null : festivalId;
  }

  toggleFestivalCardOnKeyboard(festivalId: string, keyboardEvent: KeyboardEvent): void {
    if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return;
    const focusedElement = keyboardEvent.target as HTMLElement;
    // Don't interfere with interactive children (links, buttons, etc.).
    if (focusedElement.closest('a, button, input, select, textarea')) return;
    keyboardEvent.preventDefault(); // prevent Space from scrolling the page
    this.expandedFestivalId = this.expandedFestivalId === festivalId ? null : festivalId;
  }

  toggleKebabMenu(festivalId: string, clickEvent: MouseEvent): void {
    clickEvent.stopPropagation();
    this.openKebabMenuFestivalId = this.openKebabMenuFestivalId === festivalId ? null : festivalId;
  }

  isKebabMenuOpen(festivalId: string): boolean {
    return this.openKebabMenuFestivalId === festivalId;
  }

  closeAllKebabMenus(): void {
    this.openKebabMenuFestivalId = null;
  }

  getStatusBadgeClass(statusValue: string): string {
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
    clickEvent.stopPropagation();
    this.closeAllKebabMenus();

    const festivalToDelete = this.festivalsList.find((f) => f.id === festivalId);
    if (!festivalToDelete) return;

    const confirmMessage =
      `Are you sure you want to permanently delete "${festivalToDelete.name}"?\n\n` +
      `This will also delete ALL stages and performances associated with it. This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) return;

    // Remove from personal schedule immediately (local-only, no API needed).
    this.personalScheduleService.removePerformancesByFestival(festivalId);

    // API handles cascade delete for nested stages/performances.
    this.festivalService.deleteFestival(festivalId).subscribe({
      next: () => {
        this.loadData();
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
