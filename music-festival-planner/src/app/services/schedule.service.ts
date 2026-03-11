import { Injectable } from '@angular/core';
import { Performance } from '../models/performance.model';

@Injectable({
  providedIn: 'root'
})
export class ScheduleService {
  private mockPerformances: Performance[] = [
    { id: '1', festivalId: '1', artistName: 'The Neon Shadows', stageName: 'Main Stage', date: '2026-08-01', startTime: '18:00', endTime: '19:30' },
    { id: '2', festivalId: '1', artistName: 'DJ Horizon', stageName: 'Dance Tent', date: '2026-08-01', startTime: '18:00', endTime: '19:00' },
    { id: '3', festivalId: '1', artistName: 'Electric Pulse', stageName: 'Main Stage', date: '2026-08-01', startTime: '20:00', endTime: '21:30' },
    { id: '4', festivalId: '1', artistName: 'Acoustic Wanderers', stageName: 'Forest Stage', date: '2026-08-02', startTime: '14:00', endTime: '15:00' }
  ];

  getPerformancesByFestival(festivalId: string): Performance[] {
    return this.mockPerformances
      .filter(p => p.festivalId === festivalId)
      .map(p => ({ ...p }));
  }
}