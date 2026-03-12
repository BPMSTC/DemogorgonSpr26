import { Injectable } from '@angular/core';
import { Festival } from '../models/festival.model';

@Injectable({
  providedIn: 'root',
})
export class FestivalService {
  private festivals: Festival[] = [
    {
      id: '1',
      name: 'Lollapalooza',
      startDate: '2025-08-01',
      endDate: '2025-08-04',
      location: 'Chicago, IL',
      genre: 'Rock',
      capacity: 100000,
    },
    {
      id: '2',
      name: 'Coachella',
      startDate: '2025-04-11',
      endDate: '2025-04-13',
      location: 'Indio, CA',
      genre: 'Indie',
      capacity: 125000,
    },
    {
      id: '3',
      name: 'Bonnaroo',
      startDate: '2025-06-12',
      endDate: '2025-06-15',
      location: 'Manchester, TN',
      genre: 'Multi-genre',
      capacity: 80000,
    },
  ];
  private nextId = 4;

  getFestivals(): Festival[] {
    return this.festivals.map((f) => ({ ...f }));
  }

  getFestivalById(id: string): Festival | undefined {
    const found = this.festivals.find((f) => f.id === id);
    return found ? { ...found } : undefined;
  }

  createFestival(data: Omit<Festival, 'id'>): Festival {
    const festival: Festival = { id: String(this.nextId++), ...data };
    this.festivals.push(festival);
    return { ...festival };
  }

  updateFestival(
    id: string,
    updates: Partial<Omit<Festival, 'id'>>
  ): Festival | null {
    const index = this.festivals.findIndex((f) => f.id === id);
    if (index === -1) return null;
    this.festivals[index] = { ...this.festivals[index], ...updates };
    return { ...this.festivals[index] };
  }

  deleteFestival(id: string): boolean {
    const index = this.festivals.findIndex((f) => f.id === id);
    if (index === -1) return false;
    this.festivals.splice(index, 1);
    return true;
  }
}
