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
  festival: Festival | undefined;
  stages: Stage[] = [];
  festivalId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stageService: StageService,
    private festivalService: FestivalService
  ) {}

  ngOnInit(): void {
    this.festivalId = this.route.snapshot.paramMap.get('id') ?? '';
    this.festival = this.festivalService.getFestivalById(this.festivalId);
    this.loadStages();
  }

  loadStages(): void {
    this.stages = this.stageService.getStagesByFestival(this.festivalId);
  }

  getStatusLabel(status: StageStatus): string {
    return {
      active:        'Active',
      inactive:      'Inactive',
      'under-repair':'Under Repair',
    }[status];
  }

  getStatusClass(status: StageStatus): string {
    return {
      active:        'badge-active',
      inactive:      'badge-inactive',
      'under-repair':'badge-repair',
    }[status];
  }

  addStage(): void {
    this.router.navigate(['/festivals', this.festivalId, 'stages', 'new']);
  }

  deleteStage(id: string): void {
    if (confirm('Remove this stage from the festival?')) {
      this.stageService.deleteStage(id);
      this.loadStages();
    }
  }

  goBack(): void {
    this.router.navigate(['/festivals']);
  }
}
