import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StageService } from '../../services/stage.service';
import { FestivalService } from '../../services/festival.service';
import { Festival } from '../../models/festival.model';
import { Stage, StageStatus } from '../../models/stage.model';

@Component({
  selector: 'app-stage-list',
  standalone: false,
  templateUrl: './stage-list.html',
  styleUrl: './stage-list.css',
})
export class StageListComponent implements OnInit {
  /** The parent festival (used to show the festival name in the page header). */
  currentFestival: Festival | undefined;

  /** All stages belonging to this festival, shown as a list of cards. */
  stageList: Stage[] = [];

  /** Festival ID extracted from the URL (:id route param). */
  festivalId = '';

  constructor(
    private activeRoute: ActivatedRoute,
    private router: Router,
    private stageService: StageService,
    private festivalService: FestivalService
  ) {}

  ngOnInit(): void {
    // Read the festival ID from the URL and load both the festival and its stages.
    this.festivalId      = this.activeRoute.snapshot.paramMap.get('id') ?? '';
    this.currentFestival = this.festivalService.getFestivalById(this.festivalId);

    this.refreshStageList();
  }

  /**
   * Re-fetches the stage list from the service.
   * Called on init and after any add or delete operation so the view stays in sync.
   */
  refreshStageList(): void {
    this.stageList = this.stageService.getStagesByFestival(this.festivalId);
  }

  // ---- Display Helpers ---------------------------------------------------

  /**
   * Returns a human-readable label for a stage status value.
   * Used instead of displaying raw enum strings in the UI.
   */
  getStatusDisplayLabel(stageStatus: StageStatus): string {
    const statusToLabel: Record<StageStatus, string> = {
      'active':        'Active',
      'inactive':      'Inactive',
      'under-repair':  'Under Repair',
    };
    return statusToLabel[stageStatus];
  }

  /**
   * Maps a stage status to its CSS badge class name for colored status indicators.
   */
  getStatusBadgeClass(stageStatus: StageStatus): string {
    const statusToBadgeClass: Record<StageStatus, string> = {
      'active':        'badge-active',
      'inactive':      'badge-inactive',
      'under-repair':  'badge-repair',
    };
    return statusToBadgeClass[stageStatus];
  }

  // ---- Navigation / Action Handlers --------------------------------------

  /** Routes to the "Add Stage" form for this festival. */
  navigateToAddStage(): void {
    this.router.navigate(['/festivals', this.festivalId, 'stages', 'new']);
  }

  /**
   * Prompts the user to confirm, then removes a stage by its ID.
   * Refreshes the list so the deleted card disappears immediately.
   */
  confirmAndDeleteStage(stageId: string): void {
    if (confirm('Remove this stage from the festival?')) {
      this.stageService.deleteStage(stageId);
      this.refreshStageList(); // re-fetch to remove the deleted card
    }
  }

  /** Routes back to the festivals overview page. */
  navigateBackToFestivals(): void {
    this.router.navigate(['/festivals']);
  }
}
