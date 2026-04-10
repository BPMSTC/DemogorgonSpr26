import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { FestivalService } from '../../services/festival.service';
import { StageService } from '../../services/stage.service';
import { ScheduleService } from '../../services/schedule.service';
import { PersonalScheduleService } from '../../services/personal-schedule.service';
import { Festival } from '../../models/festival.model';
import { Stage } from '../../models/stage.model';

@Component({
  selector: 'app-festivals',
  standalone: false,
  templateUrl: './festivals.html',
  styleUrl: './festivals.css',
})
export class Festivals implements OnInit, OnDestroy {
  festivalsList: Festival[] = [];

  /** Stub: swap with a real auth service when authentication is added. */
  isOrganizerUser = true;

  expandedFestivalId: string | null = null;

  /** Pre-fetched on init so the template doesn't call the service on every render. */
  stagesByFestivalId: Record<string, Stage[]> = {};

  openKebabMenuFestivalId: string | null = null;

  private routerEventsSubscription?: Subscription;

  constructor(
    private festivalService: FestivalService,
    private stageService: StageService,
    private scheduleService: ScheduleService,
    private personalScheduleService: PersonalScheduleService,
    private router: Router,
  ) {}

  private loadData(): void {
    this.festivalsList = this.festivalService.getFestivals();
    this.festivalsList.forEach((festival) => {
      this.stagesByFestivalId[festival.id] = this.stageService.getStagesByFestival(festival.id);
    });
  }

  ngOnInit(): void {
    this.loadData();
    // Keeps stage counts fresh when navigating back from stage/performance pages without a full reload.
    this.routerEventsSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.loadData();
      });
  }

  ngOnDestroy(): void {
    this.routerEventsSubscription?.unsubscribe();
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
   * Orchestrates the deletion of a festival and all its nested resources (stages, performances).
   * Prompts the user for confirmation before proceeding.
   */
  deleteFestivalWithCascade(festivalId: string, clickEvent: MouseEvent): void {
    // Stop the click from opening the card
    clickEvent.stopPropagation();

    // Close the kebab menu since the item is about to be deleted
    this.closeAllKebabMenus();

    // The component does not hold the exact festival name in a handy lookup map,
    // so we extract it from the currently loaded list for a nicer confirmation message.
    const festivalToDelete = this.festivalsList.find(f => f.id === festivalId);
    if (!festivalToDelete) return; // Should not happen

    const confirmMessage = `Are you sure you want to permanently delete "${festivalToDelete.name}"?\n\nThis will also delete ALL stages and performances associated with it. This action cannot be undone.`;

    // Real apps might use a nice modal here; we use the native browser confirm for simplicity.
    if (!window.confirm(confirmMessage)) {
      return; // User canceled
    }

    // --- Execute the cascade delete ---
    // 1. Delete the children (Performances) from personal schedule
    this.personalScheduleService.removePerformancesByFestival(festivalId);

    // 2. Delete the children (Performances) from schedule
    this.scheduleService.clearPerformancesByFestival(festivalId);

    // 3. Delete the children (Stages)
    this.stageService.clearStagesByFestival(festivalId);

    // 4. Delete the parent (Festival)
    this.festivalService.deleteFestival(festivalId);

    // --- Update the UI ---
    // Instead of doing a full page reload, just reload the data arrays
    this.loadData();

    // If the deleted festival was currently expanded, collapse it
    if (this.expandedFestivalId === festivalId) {
      this.expandedFestivalId = null;
    }
  }
}
