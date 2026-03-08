import { Injectable } from '@angular/core';
import { Festival } from '../models/festival.model';

@Injectable({
  providedIn: 'root',
})
export class FestivalService {
  private festivals: Festival[] = [];
  private nextId = 1;

  getFestivals(): Festival[] {
    return [...this.festivals];
  }

  getFestivalById(id: string): Festival | undefined {
    return this.festivals.find((f) => f.id === id);
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
