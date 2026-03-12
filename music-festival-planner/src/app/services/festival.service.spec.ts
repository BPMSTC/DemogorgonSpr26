import { TestBed } from '@angular/core/testing';
import { FestivalService } from './festival.service';
import { Festival } from '../models/festival.model';

const SAMPLE_DATA: Omit<Festival, 'id'> = {
  name: 'Lollapalooza',
  startDate: '2025-08-01',
  endDate: '2025-08-04',
  location: 'Chicago, IL',
  genre: 'Rock',
  capacity: 100000,
};

const SAMPLE_DATA_2: Omit<Festival, 'id'> = {
  name: 'Coachella',
  startDate: '2025-04-11',
  endDate: '2025-04-13',
  location: 'Indio, CA',
  genre: 'Indie',
  capacity: 125000,
};

describe('FestivalService', () => {
  let service: FestivalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FestivalService);
    // Clear seeded mock data for isolated tests
    service.getFestivals().forEach((f) => service.deleteFestival(f.id));
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------
  describe('createFestival', () => {
    it('should create a festival and return it with an assigned id', () => {
      const created = service.createFestival(SAMPLE_DATA);

      expect(created.id).toBeDefined();
      expect(created.name).toBe(SAMPLE_DATA.name);
      expect(created.startDate).toBe(SAMPLE_DATA.startDate);
      expect(created.endDate).toBe(SAMPLE_DATA.endDate);
      expect(created.location).toBe(SAMPLE_DATA.location);
      expect(created.genre).toBe(SAMPLE_DATA.genre);
      expect(created.capacity).toBe(SAMPLE_DATA.capacity);
    });

    it('should persist the created festival to storage', () => {
      service.createFestival(SAMPLE_DATA);
      const all = service.getFestivals();

      expect(all.length).toBe(1);
      expect(all[0].name).toBe(SAMPLE_DATA.name);
    });

    it('should assign unique ids to multiple festivals', () => {
      const first = service.createFestival(SAMPLE_DATA);
      const second = service.createFestival(SAMPLE_DATA_2);

      expect(first.id).not.toBe(second.id);
    });

    it('should create multiple festivals independently', () => {
      service.createFestival(SAMPLE_DATA);
      service.createFestival(SAMPLE_DATA_2);
      const all = service.getFestivals();

      expect(all.length).toBe(2);
      expect(all[0].name).toBe(SAMPLE_DATA.name);
      expect(all[1].name).toBe(SAMPLE_DATA_2.name);
    });

    it('should return a copy so mutations do not affect stored data', () => {
      const created = service.createFestival(SAMPLE_DATA);
      created.name = 'Mutated Name';
      const stored = service.getFestivalById(created.id)!;

      expect(stored.name).toBe(SAMPLE_DATA.name);
    });
  });

  // ---------------------------------------------------------------------------
  // READ
  // ---------------------------------------------------------------------------
  describe('getFestivals', () => {
    it('should return an empty array when no festivals exist', () => {
      expect(service.getFestivals()).toEqual([]);
    });

    it('should return all created festivals', () => {
      service.createFestival(SAMPLE_DATA);
      service.createFestival(SAMPLE_DATA_2);
      const all = service.getFestivals();

      expect(all.length).toBe(2);
    });

    it('should return a copy so external mutations do not affect stored data', () => {
      service.createFestival(SAMPLE_DATA);
      const all = service.getFestivals();
      all[0].name = 'Mutated';
      const stored = service.getFestivals();

      expect(stored[0].name).toBe(SAMPLE_DATA.name);
    });
  });

  describe('getFestivalById', () => {
    it('should return the correct festival by id', () => {
      const created = service.createFestival(SAMPLE_DATA);
      const found = service.getFestivalById(created.id);

      expect(found).toBeDefined();
      expect(found!.name).toBe(SAMPLE_DATA.name);
    });

    it('should return undefined for a non-existent id', () => {
      expect(service.getFestivalById('nonexistent')).toBeUndefined();
    });

    it('should return undefined when storage is empty', () => {
      expect(service.getFestivalById('9999')).toBeUndefined();
    });

    it('should return the correct festival when multiple exist', () => {
      const first = service.createFestival(SAMPLE_DATA);
      const second = service.createFestival(SAMPLE_DATA_2);

      expect(service.getFestivalById(first.id)!.name).toBe(SAMPLE_DATA.name);
      expect(service.getFestivalById(second.id)!.name).toBe(SAMPLE_DATA_2.name);
    });

    it('should return a copy so mutations do not affect stored data', () => {
      const created = service.createFestival(SAMPLE_DATA);
      const found = service.getFestivalById(created.id)!;
      found.name = 'Mutated Name';
      const stored = service.getFestivalById(created.id)!;

      expect(stored.name).toBe(SAMPLE_DATA.name);
    });
  });

  // ---------------------------------------------------------------------------
  // UPDATE
  // ---------------------------------------------------------------------------
  describe('updateFestival', () => {
    it('should update a festival and return the updated record', () => {
      const created = service.createFestival(SAMPLE_DATA);
      const updated = service.updateFestival(created.id, { name: 'Updated Name' });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe('Updated Name');
      expect(updated!.id).toBe(created.id);
    });

    it('should persist the update in storage', () => {
      const created = service.createFestival(SAMPLE_DATA);
      service.updateFestival(created.id, { name: 'Persisted Name' });
      const stored = service.getFestivalById(created.id);

      expect(stored!.name).toBe('Persisted Name');
    });

    it('should support partial updates without overwriting other fields', () => {
      const created = service.createFestival(SAMPLE_DATA);
      service.updateFestival(created.id, { location: 'New York, NY' });
      const stored = service.getFestivalById(created.id)!;

      expect(stored.location).toBe('New York, NY');
      expect(stored.name).toBe(SAMPLE_DATA.name);
      expect(stored.genre).toBe(SAMPLE_DATA.genre);
      expect(stored.capacity).toBe(SAMPLE_DATA.capacity);
    });

    it('should update multiple fields at once', () => {
      const created = service.createFestival(SAMPLE_DATA);
      service.updateFestival(created.id, { name: 'New Name', capacity: 50000 });
      const stored = service.getFestivalById(created.id)!;

      expect(stored.name).toBe('New Name');
      expect(stored.capacity).toBe(50000);
    });

    it('should return null for a non-existent id', () => {
      const result = service.updateFestival('nonexistent', { name: 'Ghost' });

      expect(result).toBeNull();
    });

    it('should not affect other festivals when one is updated', () => {
      const first = service.createFestival(SAMPLE_DATA);
      service.createFestival(SAMPLE_DATA_2);
      service.updateFestival(first.id, { name: 'Changed' });
      const second = service.getFestivals().find((f) => f.name === SAMPLE_DATA_2.name);

      expect(second).toBeDefined();
      expect(second!.name).toBe(SAMPLE_DATA_2.name);
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------------------------
  describe('deleteFestival', () => {
    it('should delete a festival and return true', () => {
      const created = service.createFestival(SAMPLE_DATA);
      const result = service.deleteFestival(created.id);

      expect(result).toBe(true);
    });

    it('should remove the festival from storage after deletion', () => {
      const created = service.createFestival(SAMPLE_DATA);
      service.deleteFestival(created.id);

      expect(service.getFestivals().length).toBe(0);
      expect(service.getFestivalById(created.id)).toBeUndefined();
    });

    it('should return false for a non-existent id', () => {
      const result = service.deleteFestival('nonexistent');

      expect(result).toBe(false);
    });

    it('should only delete the targeted festival and preserve others', () => {
      const first = service.createFestival(SAMPLE_DATA);
      const second = service.createFestival(SAMPLE_DATA_2);
      service.deleteFestival(first.id);
      const remaining = service.getFestivals();

      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe(second.id);
      expect(remaining[0].name).toBe(SAMPLE_DATA_2.name);
    });

    it('should maintain correct festival count after multiple deletions', () => {
      const first = service.createFestival(SAMPLE_DATA);
      const second = service.createFestival(SAMPLE_DATA_2);
      service.deleteFestival(first.id);
      service.deleteFestival(second.id);

      expect(service.getFestivals().length).toBe(0);
    });

    it('should not affect storage when deleting a non-existent id', () => {
      service.createFestival(SAMPLE_DATA);
      service.deleteFestival('nonexistent');

      expect(service.getFestivals().length).toBe(1);
    });
  });
});
