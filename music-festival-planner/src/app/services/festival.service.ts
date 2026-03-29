import { Injectable } from '@angular/core';
import { Festival } from '../models/festival.model';

@Injectable({
  providedIn: 'root', // singleton — one shared instance across the whole app
})
export class FestivalService {
  /**
   * In-memory store of all festival records.
   * Starts empty; festivals are added at runtime through the create form.
   */
  private festivalStore: Festival[] = [];

  /** Auto-incrementing counter for generating unique festival IDs. */
  private nextFestivalId = 1;

  // ---- Read Methods ------------------------------------------------------

  /** Returns a shallow copy of every festival so callers cannot mutate the store. */
  getFestivals(): Festival[] {
    return this.festivalStore.map((festival) => ({ ...festival }));
  }

  /**
   * Looks up a single festival by its ID.
   * Returns undefined if no match is found rather than throwing.
   */
  getFestivalById(targetId: string): Festival | undefined {
    const matchedFestival = this.festivalStore.find((festival) => festival.id === targetId);
    // Return a copy so external code cannot accidentally edit the store entry.
    return matchedFestival ? { ...matchedFestival } : undefined;
  }

  // ---- Write Methods -----------------------------------------------------

  /**
   * Validates and saves a new festival record.
   * Throws an Error (shown to the user) if the date range is invalid.
   */
  createFestival(newFestivalData: Omit<Festival, 'id'>): Festival {
    // Business rule: a festival cannot end before it starts.
    if (newFestivalData.endDate < newFestivalData.startDate) {
      throw new Error('endDate must be on or after startDate.');
    }

    const savedFestival: Festival = {
      id: String(this.nextFestivalId++), // assign next available ID
      ...newFestivalData,
    };

    this.festivalStore.push(savedFestival);
    return { ...savedFestival }; // return a copy, not the stored reference
  }

  /**
   * Merges partial field updates into an existing festival record.
   * Returns the updated festival copy, or null if the ID was not found.
   */
  updateFestival(
    targetId: string,
    fieldsToUpdate: Partial<Omit<Festival, 'id'>>
  ): Festival | null {
    const festivalIndex = this.festivalStore.findIndex(
      (festival) => festival.id === targetId
    );

    if (festivalIndex === -1) return null; // no such festival

    // Spread the existing record first, then overwrite only the provided fields.
    this.festivalStore[festivalIndex] = {
      ...this.festivalStore[festivalIndex],
      ...fieldsToUpdate,
    };

    return { ...this.festivalStore[festivalIndex] };
  }

  /**
   * Permanently removes a festival from the store by ID.
   * @returns true if deleted, false if the ID was not found.
   */
  deleteFestival(targetId: string): boolean {
    const festivalIndex = this.festivalStore.findIndex(
      (festival) => festival.id === targetId
    );

    if (festivalIndex === -1) return false;

    this.festivalStore.splice(festivalIndex, 1); // remove the single entry
    return true;
  }
}
