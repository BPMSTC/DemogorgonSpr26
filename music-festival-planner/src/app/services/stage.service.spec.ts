import { TestBed } from '@angular/core/testing';
import { StageService } from './stage.service';
import { Stage } from '../models/stage.model';
import { LOCAL_STORAGE } from './schedule.service';

/** In-memory storage used to isolate tests from browser localStorage state. */
class MockStorage implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

const BASE_DATA: Omit<Stage, 'id'> = {
  festivalId: '99',
  name: 'Test Stage',
  capacity: 1000,
  environment: 'outdoor',
  status: 'active',
};

describe('StageService', () => {
  let service: StageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: LOCAL_STORAGE, useValue: new MockStorage() }],
    });
    service = TestBed.inject(StageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------
  describe('createStage', () => {
    it('should create a stage and return it with an assigned id', () => {
      const created = service.createStage(BASE_DATA);

      expect(created.id).toBeDefined();
      expect(created.name).toBe(BASE_DATA.name);
      expect(created.capacity).toBe(BASE_DATA.capacity);
    });

    it('should throw when capacity is zero', () => {
      expect(() =>
        service.createStage({ ...BASE_DATA, capacity: 0 })
      ).toThrowError('capacity must be a positive integer.');
    });

    it('should throw when capacity is negative', () => {
      expect(() =>
        service.createStage({ ...BASE_DATA, capacity: -5 })
      ).toThrowError('capacity must be a positive integer.');
    });

    it('should throw when capacity is a non-integer (float)', () => {
      expect(() =>
        service.createStage({ ...BASE_DATA, capacity: 1.5 })
      ).toThrowError('capacity must be a positive integer.');
    });

    it('should allow capacity of 1 (minimum valid value)', () => {
      const created = service.createStage({ ...BASE_DATA, capacity: 1 });
      expect(created.id).toBeDefined();
    });

    it('should not persist a stage when capacity validation fails', () => {
      const before = service.getStagesByFestival(BASE_DATA.festivalId).length;
      try {
        service.createStage({ ...BASE_DATA, capacity: 0 });
      } catch {
        // expected
      }
      expect(service.getStagesByFestival(BASE_DATA.festivalId).length).toBe(before);
    });

    it('should throw when a duplicate stage name exists for the same festival', () => {
      service.createStage(BASE_DATA);
      expect(() =>
        service.createStage(BASE_DATA)
      ).toThrowError(`A stage named "${BASE_DATA.name}" already exists for this festival.`);
    });

    it('should return a copy so mutations do not affect stored data', () => {
      const created = service.createStage(BASE_DATA);
      created.name = 'Mutated Name';
      const stored = service.getStageById(created.id)!;

      expect(stored.name).toBe(BASE_DATA.name);
    });
  });

  // ---------------------------------------------------------------------------
  // READ
  // ---------------------------------------------------------------------------
  describe('getStagesByFestival', () => {
    it('should return only stages for the given festival', () => {
      service.createStage(BASE_DATA);
      const stages = service.getStagesByFestival(BASE_DATA.festivalId);

      expect(stages.every((s) => s.festivalId === BASE_DATA.festivalId)).toBe(true);
    });

    it('should return an empty array when no stages exist for a festival', () => {
      expect(service.getStagesByFestival('nonexistent')).toEqual([]);
    });

    it('should return copies so external mutations do not affect stored data', () => {
      service.createStage(BASE_DATA);
      const stages = service.getStagesByFestival(BASE_DATA.festivalId);
      stages[0].name = 'Mutated';
      const stored = service.getStagesByFestival(BASE_DATA.festivalId);

      expect(stored[0].name).toBe(BASE_DATA.name);
    });
  });

  describe('getStageById', () => {
    it('should return the correct stage by id', () => {
      const created = service.createStage(BASE_DATA);
      const found = service.getStageById(created.id);

      expect(found).toBeDefined();
      expect(found!.name).toBe(BASE_DATA.name);
    });

    it('should return undefined for a non-existent id', () => {
      expect(service.getStageById('nonexistent')).toBeUndefined();
    });
  });
});
