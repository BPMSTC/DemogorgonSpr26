import { Component, OnInit } from '@angular/core';
import { FestivalService } from '../../services/festival.service';
import { StageService } from '../../services/stage.service';
import { Festival } from '../../models/festival.model';
import { Stage } from '../../models/stage.model';

@Component({
  selector: 'app-festivals',
  standalone: false,
  templateUrl: './festivals.html',
  styleUrl: './festivals.css',
})
export class Festivals implements OnInit {
  /** All festivals retrieved from FestivalService, shown as expandable cards. */
  festivalsList: Festival[] = [];

  /**
   * Controls visibility of organizer-only actions (manage stages, add performance).
   * Stub: swap this with a real auth service call when authentication is added.
   */
  isOrganizerUser = true;

  /**
   * ID of the festival card that is currently expanded to show its stage list.
   * Null means all cards are collapsed.  Only one card can be open at a time.
   */
  expandedFestivalId: string | null = null;

  /**
   * Pre-fetched stages keyed by festival ID.
   * Populated on init so the template does not need to call the service on every render.
   */
  stagesByFestivalId: Record<string, Stage[]> = {};

  /**
   * ID of the festival whose kebab (⋮) options menu is currently open.
   * Null means no menu is open.
   */
  openKebabMenuFestivalId: string | null = null;

  constructor(
    private festivalService: FestivalService,
    private stageService: StageService
  ) {}

  ngOnInit(): void {
    // Load all festivals for the card grid.
    this.festivalsList = this.festivalService.getFestivals();

    // Pre-fetch stages for every festival so the expanded panel renders instantly.
    this.festivalsList.forEach((festival) => {
      this.stagesByFestivalId[festival.id] = this.stageService.getStagesByFestival(festival.id);
    });
  }

  // ---- Card Expand / Collapse --------------------------------------------

  /**
   * Toggles the expanded state of the clicked card.
   * If the same card is already open, it collapses. Clicks inside the kebab
   * menu are ignored here (the menu handles its own toggle).
   */
  toggleFestivalCard(festivalId: string, clickEvent: MouseEvent): void {
    const clickedElement = clickEvent.target as HTMLElement;

    // Kebab menu clicks are handled by toggleKebabMenu — don't interfere.
    if (clickedElement.closest('.kebab-menu')) return;

    // Toggle: clicking the already-expanded card collapses it; clicking any
    // other card opens it and implicitly closes the previously open one.
    this.expandedFestivalId =
      this.expandedFestivalId === festivalId ? null : festivalId;
  }

  /**
   * Keyboard equivalent of toggleFestivalCard.
   * Activates on Enter or Space so keyboard-only users can expand/collapse cards.
   * Ignores presses that originate inside interactive child elements
   * (links, buttons, inputs) to avoid interfering with their native behavior.
   */
  toggleFestivalCardOnKeyboard(festivalId: string, keyboardEvent: KeyboardEvent): void {
    if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return;

    const focusedElement = keyboardEvent.target as HTMLElement;

    // Let native interactions (clicking a link inside the card) work normally.
    if (focusedElement.closest('a, button, input, select, textarea')) return;

    keyboardEvent.preventDefault(); // prevent Space from scrolling the page
    this.expandedFestivalId =
      this.expandedFestivalId === festivalId ? null : festivalId;
  }

  // ---- Kebab Menu --------------------------------------------------------

  /**
   * Toggles the options (⋮) dropdown for a specific festival card.
   * stopPropagation prevents the card's own click handler from firing.
   */
  toggleKebabMenu(festivalId: string, clickEvent: MouseEvent): void {
    clickEvent.stopPropagation(); // don't bubble up to the card toggle handler
    this.openKebabMenuFestivalId =
      this.openKebabMenuFestivalId === festivalId ? null : festivalId;
  }

  /** Returns true if the kebab menu for the given festival is currently open. */
  isKebabMenuOpen(festivalId: string): boolean {
    return this.openKebabMenuFestivalId === festivalId;
  }

  /** Closes all open kebab menus. Called when the user clicks outside any card. */
  closeAllKebabMenus(): void {
    this.openKebabMenuFestivalId = null;
  }

  // ---- Stage Helpers -----------------------------------------------------

  /** Returns the cached stage list for a festival (or an empty array if not found). */
  getStagesForFestival(festivalId: string): Stage[] {
    return this.stagesByFestivalId[festivalId] ?? [];
  }

  // ---- CSS Helpers -------------------------------------------------------

  /**
   * Maps a stage status string to its corresponding CSS badge class name.
   * Returns an empty string for any unknown status value.
   */
  getStatusBadgeClass(statusValue: string): string {
    const statusToBadgeClass: Record<string, string> = {
      'active':       'badge-active',
      'inactive':     'badge-inactive',
      'under-repair': 'badge-repair',
    };
    return statusToBadgeClass[statusValue] ?? '';
  }
}
