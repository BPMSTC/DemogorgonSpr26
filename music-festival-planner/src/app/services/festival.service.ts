import { Injectable, Inject } from '@angular/core';
import { Festival } from '../models/festival.model';
import { LOCAL_STORAGE } from './schedule.service';

const STORAGE_KEY = 'mfp_festivals';

@Injectable({
  providedIn: 'root',
})
export class FestivalService {
  private festivalStore: Festival[] = [];
  private nextFestivalId = 1;

  constructor(@Inject(LOCAL_STORAGE) private storage: Storage) {
    this.festivalStore = this.loadFromStorage();
    this.nextFestivalId =
      this.festivalStore.reduce((highestIdSoFar, currentFestival) =>
        Math.max(highestIdSoFar, Number(currentFestival.id) || 0), 0) + 1;
  }

  private isValidStoredFestival(entry: unknown): entry is Festival {
    if (entry === null || typeof entry !== 'object') return false;
    const candidate = entry as { [key: string]: unknown };
    if (
      typeof candidate['id'] !== 'string' ||
      typeof candidate['name'] !== 'string' ||
      typeof candidate['startDate'] !== 'string' ||
      typeof candidate['endDate'] !== 'string' ||
      typeof candidate['location'] !== 'string'
    ) {
      return false;
    }
    if (candidate['genre'] !== undefined && typeof candidate['genre'] !== 'string') return false;
    if (candidate['capacity'] !== undefined && typeof candidate['capacity'] !== 'number') return false;
    return true;
  }

  private loadFromStorage(): Festival[] {
    try {
      const rawTextData = this.storage.getItem(STORAGE_KEY);
      if (rawTextData === null) return [];
      const parsedData = JSON.parse(rawTextData);
      if (!Array.isArray(parsedData)) return [];
      return parsedData
        .filter((entry) => this.isValidStoredFestival(entry))
        .map((festival) => ({ ...festival }));
    } catch {
      return [];
    }
  }

  private saveToStorage(): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.festivalStore));
    } catch {
      // Silently ignore storage errors (e.g. quota exceeded).
    }
  }

  getFestivals(): Festival[] {
    return this.festivalStore.map((festival) => ({ ...festival }));
  }

  getFestivalById(targetId: string): Festival | undefined {
    const matchedFestival = this.festivalStore.find((festival) => festival.id === targetId);
    return matchedFestival ? { ...matchedFestival } : undefined;
  }

  createFestival(newFestivalData: Omit<Festival, 'id'>): Festival {
    if (newFestivalData.endDate < newFestivalData.startDate) {
      throw new Error('The end date must be on or after the start date.');
    }
    const savedFestival: Festival = {
      id: String(this.nextFestivalId++),
      ...newFestivalData,
    };
    this.festivalStore.push(savedFestival);
    this.saveToStorage();
    return { ...savedFestival };
  }

  updateFestival(targetId: string, fieldsToChange: Partial<Omit<Festival, 'id'>>): Festival | null {
    const festivalIndex = this.festivalStore.findIndex((festival) => festival.id === targetId);
    if (festivalIndex === -1) return null;
    this.festivalStore[festivalIndex] = {
      ...this.festivalStore[festivalIndex],
      ...fieldsToChange,
    };
    this.saveToStorage();
    return { ...this.festivalStore[festivalIndex] };
  }

  deleteFestival(targetId: string): boolean {
    const festivalIndex = this.festivalStore.findIndex((festival) => festival.id === targetId);
    if (festivalIndex === -1) return false;
    this.festivalStore.splice(festivalIndex, 1);
    this.saveToStorage();
    return true;
  }
}
