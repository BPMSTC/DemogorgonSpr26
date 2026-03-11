import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ScheduleService } from '../../services/schedule.service';
import { Performance } from '../../models/performance.model';

@Component({
  selector: 'app-my-schedule',
  standalone: false,
  templateUrl: './my-schedule.html',
  styleUrl: './my-schedule.css',
})
export class MySchedule implements OnInit {
  festivalId: string = '';
  allPerformances: Performance[] = [];
  
  festivalDays: string[] = [];
  selectedDay: string = '';

  stages: string[] = [];
  times: string[] = [];
  filteredPerformances: Performance[] = [];

  // NEW: Dictionary for lightning-fast template lookups
  performanceGrid: Record<string, Performance | undefined> = {};

  constructor(
    private route: ActivatedRoute,
    private scheduleService: ScheduleService
  ) {}

  ngOnInit(): void {
    this.festivalId = this.route.snapshot.paramMap.get('id') ?? '1';
    this.allPerformances = this.scheduleService.getPerformancesByFestival(this.festivalId);
    
    this.festivalDays = [...new Set(this.allPerformances.map(p => p.date))].sort();
    
    if (this.festivalDays.length > 0) {
      this.selectDay(this.festivalDays[0]);
    }
  }

  selectDay(day: string): void {
    this.selectedDay = day;
    this.filteredPerformances = this.allPerformances.filter(p => p.date === day);

    this.stages = [...new Set(this.filteredPerformances.map(p => p.stageName))].sort();
    this.times = [...new Set(this.filteredPerformances.map(p => p.startTime))].sort();

    // NEW: Build the lookup dictionary. 
    // Key format: "18:00-Main Stage"
    this.performanceGrid = {};
    for (const perf of this.filteredPerformances) {
      const gridKey = `${perf.startTime}-${perf.stageName}`;
      this.performanceGrid[gridKey] = perf;
    }
  }
}