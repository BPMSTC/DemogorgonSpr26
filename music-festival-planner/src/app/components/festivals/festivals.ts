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
  festivalsList: Festival[] = [];

  // Stub: swap this with a real auth service later
  isOrganizer = true;

  // Only one card open at a time — store its id, or null if all closed
  expandedId: string | null = null;

  // Cache stages per festival id
  stagesMap: Record<string, Stage[]> = {};

  // Track which kebab menu is open
  openMenuId: string | null = null;

  constructor(
    private festivalService: FestivalService,
    private stageService: StageService
  ) {}

  ngOnInit(): void {
    this.festivalsList = this.festivalService.getFestivals();
    this.festivalsList.forEach((f) => {
      this.stagesMap[f.id] = this.stageService.getStagesByFestival(f.id);
    });
  }

  toggleCard(festivalId: string, event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.kebab-menu')) return;
    this.expandedId = this.expandedId === festivalId ? null : festivalId;
  }

  isExpanded(festivalId: string): boolean {
    return this.expandedId === festivalId;
  }

  toggleMenu(festivalId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === festivalId ? null : festivalId;
  }

  isMenuOpen(festivalId: string): boolean {
    return this.openMenuId === festivalId;
  }

  closeMenus(): void {
    this.openMenuId = null;
  }

  getStages(festivalId: string): Stage[] {
    return this.stagesMap[festivalId] ?? [];
  }

  getStatusClass(status: string): string {
    return ({
      'active':       'badge-active',
      'inactive':     'badge-inactive',
      'under-repair': 'badge-repair',
    } as Record<string, string>)[status] ?? '';
  }
}
