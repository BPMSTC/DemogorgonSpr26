import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StageService } from '../../services/stage.service';
import { FestivalService } from '../../services/festival.service';
import { Festival } from '../../models/festival.model';
import { Stage, StageStatus } from '../../models/stage.model';

// Show all stages for a festival and let admins add or remove them.
@Component({
  selector: 'app-stage-list',
  standalone: false,
  templateUrl: './stage-list.html',
  styleUrl: './stage-list.css',
})
export class StageListComponent implements OnInit {
  // The festival whose stages are being displayed.
  currentFestival: Festival | undefined;
  // The list of stages belonging to this festival.
  stageList: Stage[] = [];
  // The festival id read from the URL so we know which festival to load.
  festivalId = '';

  // Inject routing, stage, and festival services needed to load and manage stages.
  constructor(
    private activeRoute: ActivatedRoute,
    private router: Router,
    private stageService: StageService,
    private festivalService: FestivalService,
  ) {}

  ngOnInit(): void {
    // Pull the festival id out of the URL so we know which festival to load.
    this.festivalId = this.activeRoute.snapshot.paramMap.get('id') ?? '';

    // Load festival name for the page header.
    this.festivalService.loadById(this.festivalId).subscribe({
      next: (festival) => {
        // Store the festival so the template can show its name.
        this.currentFestival = festival;
      },
      error: () => {
        // Clear the festival reference if the load fails so the template shows a fallback.
        this.currentFestival = undefined;
      },
    });

    // Load the initial list of stages for this festival.
    this.refreshStageList();
  }

  refreshStageList(): void {
    // Ask the service for the latest stages and update the list the template renders.
    this.stageService.loadByFestival(this.festivalId).subscribe({
      next: (stages) => {
        // Replace the current list with the freshly loaded stages.
        this.stageList = stages;
      },
      error: () => {
        // Show an empty list rather than stale data if the fetch fails.
        this.stageList = [];
      },
    });
  }

  // ---- Display Helpers ---------------------------------------------------

  getStatusDisplayLabel(stageStatus: StageStatus): string {
    // Map each status value to a human-readable label for the template.
    const statusToLabel: Record<StageStatus, string> = {
      active: 'Active',
      inactive: 'Inactive',
      'under-repair': 'Under Repair',
    };
    // Return the matching label for the given status.
    return statusToLabel[stageStatus];
  }

  getStatusBadgeClass(stageStatus: StageStatus): string {
    // Map each status to the CSS class that gives the badge the right colour.
    const statusToBadgeClass: Record<StageStatus, string> = {
      active: 'badge-active',
      inactive: 'badge-inactive',
      'under-repair': 'badge-repair',
    };
    // Return the CSS class name for the given status.
    return statusToBadgeClass[stageStatus];
  }

  // ---- Navigation / Action Handlers --------------------------------------

  navigateToAddStage(): void {
    // Send the user to the form for creating a new stage under this festival.
    this.router.navigate(['/festivals', this.festivalId, 'stages', 'new']);
  }

  confirmAndDeleteStage(stageId: string): void {
    // Ask the user to confirm before permanently removing the stage.
    if (confirm('Remove this stage from the festival?')) {
      this.stageService.deleteStage(stageId).subscribe({
        // Refresh the list whether the delete succeeded or failed, so the UI stays accurate.
        next: () => this.refreshStageList(),
        error: () => this.refreshStageList(),
      });
    }
  }

  navigateBackToFestivals(): void {
    // Return the user to the main festivals listing page.
    this.router.navigate(['/festivals']);
  }
}
