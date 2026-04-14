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
  currentFestival: Festival | undefined;
  stageList: Stage[] = [];
  festivalId = '';

  constructor(
    private activeRoute: ActivatedRoute,
    private router: Router,
    private stageService: StageService,
    private festivalService: FestivalService
  ) {}

  ngOnInit(): void {
    this.festivalId = this.activeRoute.snapshot.paramMap.get('id') ?? '';

    // Load festival name for the page header.
    this.festivalService.load().subscribe(() => {
      this.currentFestival = this.festivalService.getFestivalById(this.festivalId);
    });

    this.refreshStageList();
  }

  refreshStageList(): void {
    this.stageService.loadByFestival(this.festivalId).subscribe((stages) => {
      this.stageList = stages;
    });
  }

  // ---- Display Helpers ---------------------------------------------------

  getStatusDisplayLabel(stageStatus: StageStatus): string {
    const statusToLabel: Record<StageStatus, string> = {
      'active':       'Active',
      'inactive':     'Inactive',
      'under-repair': 'Under Repair',
    };
    return statusToLabel[stageStatus];
  }

  getStatusBadgeClass(stageStatus: StageStatus): string {
    const statusToBadgeClass: Record<StageStatus, string> = {
      'active':       'badge-active',
      'inactive':     'badge-inactive',
      'under-repair': 'badge-repair',
    };
    return statusToBadgeClass[stageStatus];
  }

  // ---- Navigation / Action Handlers --------------------------------------

  navigateToAddStage(): void {
    this.router.navigate(['/festivals', this.festivalId, 'stages', 'new']);
  }

  confirmAndDeleteStage(stageId: string): void {
    if (confirm('Remove this stage from the festival?')) {
      this.stageService.deleteStage(stageId).subscribe({
        next: () => this.refreshStageList(),
        error: () => this.refreshStageList(),
      });
    }
  }

  navigateBackToFestivals(): void {
    this.router.navigate(['/festivals']);
  }
}
