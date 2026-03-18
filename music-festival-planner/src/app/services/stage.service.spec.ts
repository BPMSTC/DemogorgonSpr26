import { TestBed } from '@angular/core/testing';
import { StageService } from './stage.service';
import { Stage } from '../models/stage.model';

const SAMPLE_DATA: Omit<Stage, 'id'> = {
  festivalId: 'fest-1',
  name: 'Main Stage',
  capacity: 5000,
  environment: 'outdoor',
  status: 'active',
  notes: 'Primary stage.',
};

const SAMPLE_DATA_2: Omit<Stage, 'id'> = {
  festivalId: 'fest-1',
  name: 'Indie Stage',
  capacity: 1500,
  environment: 'outdoor',
  status: 'active',
  notes: 'Indie acts.',
};

describe('StageService', () => {
  let service: StageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StageService);

    // Remove seeded data so each test starts clean
    service.getStagesByFestival('1').forEach((s) => service.deleteStage(s.id));
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------
  describe('createStage', () => {
    it('should create a stage and return it with an assigned id', () => {
      const created = service.createStage(SAMPLE_DATA);

      expect(created.id).toBeDefined();
      expect(created.name).toBe(SAMPLE_DATA.name);
      expect(created.festivalId).toBe(SAMPLE_DATA.festivalId);
      expect(created.capacity).toBe(SAMPLE_DATA.capacity);
      expect(created.environment).toBe(SAMPLE_DATA.environment);
      expect(created.status).toBe(SAMPLE_DATA.status);
    });

    it('should persist the created stage to storage', () => {
      service.createStage(SAMPLE_DATA);
      const all = service.getStagesByFestival(SAMPLE_DATA.festivalId);

      expect(all.length).toBe(1);
      expect(all[0].name).toBe(SAMPLE_DATA.name);
    });

    it('should assign unique ids to multiple stages', () => {
      const first = service.createStage(SAMPLE_DATA);
      const second = service.createStage(SAMPLE_DATA_2);

      expect(first.id).not.toBe(second.id);
    });

    it('should return a copy so mutations do not affect stored data', () => {
      const created = service.createStage(SAMPLE_DATA);
      created.name = 'Mutated Name';
      const stored = service.getStageById(created.id)!;

      expect(stored.name).toBe(SAMPLE_DATA.name);
    });

    it('should throw when a duplicate name is used (exact match)', () => {
      service.createStage(SAMPLE_DATA);
      expect(() => service.createStage(SAMPLE_DATA)).toThrowError(
        /already exists/i
      );
    });

    it('should throw when a duplicate name is used (case-insensitive)', () => {
      service.createStage(SAMPLE_DATA);
      const duplicate: Omit<Stage, 'id'> = { ...SAMPLE_DATA, name: 'MAIN STAGE' };
      expect(() => service.createStage(duplicate)).toThrowError(
        /already exists/i
      );
    });

    it('should allow the same stage name for different festivals', () => {
      service.createStage(SAMPLE_DATA);
      const otherFestival: Omit<Stage, 'id'> = {
        ...SAMPLE_DATA,
        festivalId: 'fest-2',
      };
      expect(() => service.createStage(otherFestival)).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // READ
  // ---------------------------------------------------------------------------
  describe('getStagesByFestival', () => {
    it('should return an empty array when no stages exist for a festival', () => {
      expect(service.getStagesByFestival('unknown-fest')).toEqual([]);
    });

    it('should return only stages belonging to the given festival', () => {
      service.createStage(SAMPLE_DATA);
      service.createStage({ ...SAMPLE_DATA_2, festivalId: 'fest-2' });
      const stages = service.getStagesByFestival(SAMPLE_DATA.festivalId);

      expect(stages.length).toBe(1);
      expect(stages[0].name).toBe(SAMPLE_DATA.name);
    });

    it('should return a copy so external mutations do not affect stored data', () => {
      service.createStage(SAMPLE_DATA);
      const all = service.getStagesByFestival(SAMPLE_DATA.festivalId);
      all[0].name = 'Mutated';
      const stored = service.getStagesByFestival(SAMPLE_DATA.festivalId);

      expect(stored[0].name).toBe(SAMPLE_DATA.name);
    });
  });

  describe('getStageById', () => {
    it('should return the correct stage by id', () => {
      const created = service.createStage(SAMPLE_DATA);
      const found = service.getStageById(created.id);

      expect(found).toBeDefined();
      expect(found!.name).toBe(SAMPLE_DATA.name);
    });

    it('should return undefined for a non-existent id', () => {
      expect(service.getStageById('nonexistent')).toBeUndefined();
    });

    it('should return a copy so mutations do not affect stored data', () => {
      const created = service.createStage(SAMPLE_DATA);
      const found = service.getStageById(created.id)!;
      found.name = 'Mutated';
      const stored = service.getStageById(created.id)!;

      expect(stored.name).toBe(SAMPLE_DATA.name);
    });
  });

  // ---------------------------------------------------------------------------
  // UPDATE
  // ---------------------------------------------------------------------------
  describe('updateStage', () => {
    it('should update a stage and return the updated record', () => {
      const created = service.createStage(SAMPLE_DATA);
      const updated = service.updateStage(created.id, { capacity: 9000 });

      expect(updated).not.toBeNull();
      expect(updated!.capacity).toBe(9000);
      expect(updated!.id).toBe(created.id);
    });

    it('should persist the update in storage', () => {
      const created = service.createStage(SAMPLE_DATA);
      service.updateStage(created.id, { status: 'inactive' });
      const stored = service.getStageById(created.id);

      expect(stored!.status).toBe('inactive');
    });

    it('should support partial updates without overwriting other fields', () => {
      const created = service.createStage(SAMPLE_DATA);
      service.updateStage(created.id, { notes: 'Updated notes' });
      const stored = service.getStageById(created.id)!;

      expect(stored.notes).toBe('Updated notes');
      expect(stored.name).toBe(SAMPLE_DATA.name);
      expect(stored.capacity).toBe(SAMPLE_DATA.capacity);
    });

    it('should return null for a non-existent id', () => {
      const result = service.updateStage('nonexistent', { capacity: 100 });

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------------------------
  describe('deleteStage', () => {
    it('should delete a stage and return true', () => {
      const created = service.createStage(SAMPLE_DATA);
      const result = service.deleteStage(created.id);

      expect(result).toBe(true);
    });

    it('should remove the stage from storage after deletion', () => {
      const created = service.createStage(SAMPLE_DATA);
      service.deleteStage(created.id);

      expect(service.getStagesByFestival(SAMPLE_DATA.festivalId).length).toBe(0);
      expect(service.getStageById(created.id)).toBeUndefined();
    });

    it('should return false for a non-existent id', () => {
      const result = service.deleteStage('nonexistent');

      expect(result).toBe(false);
    });

    it('should only delete the targeted stage and preserve others', () => {
      const first = service.createStage(SAMPLE_DATA);
      const second = service.createStage(SAMPLE_DATA_2);
      service.deleteStage(first.id);
      const remaining = service.getStagesByFestival(SAMPLE_DATA.festivalId);

      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe(second.id);
    });

    it('should allow re-use of a deleted stage name', () => {
      const created = service.createStage(SAMPLE_DATA);
      service.deleteStage(created.id);

      // Re-creating with the same name must succeed now
      expect(() => service.createStage(SAMPLE_DATA)).not.toThrow();
    });
  });
});
