import { TestBed } from '@angular/core/testing';
import { ScheduleService } from './schedule.service';
import { Performance } from '../models/performance.model';

const BASE_PERFORMANCE: Omit<Performance, 'id'> = {
  festivalId: 'fest-1',
  artistName: 'Test Artist',
  stageName: 'Main Stage',
  date: '2026-09-01',
  startTime: '10:00',
  endTime: '11:00',
};

describe('ScheduleService', () => {
  let service: ScheduleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScheduleService);

    // Remove seeded mock data so each test starts from a clean slate
    service.getPerformancesByFestival('1').forEach((p) => service.deletePerformance(p.id));
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // createPerformance – validation: invalid times
  // ---------------------------------------------------------------------------
  describe('createPerformance – time validation', () => {
    it('should throw when startTime is invalid', () => {
      expect(() =>
        service.createPerformance({ ...BASE_PERFORMANCE, startTime: 'bad' })
      ).toThrowError(/valid 24-hour/i);
    });

    it('should throw when endTime is invalid', () => {
      expect(() =>
        service.createPerformance({ ...BASE_PERFORMANCE, endTime: 'bad' })
      ).toThrowError(/valid 24-hour/i);
    });

    it('should throw when endTime equals startTime', () => {
      expect(() =>
        service.createPerformance({ ...BASE_PERFORMANCE, startTime: '10:00', endTime: '10:00' })
      ).toThrowError(/end time must be later/i);
    });

    it('should throw when endTime is before startTime', () => {
      expect(() =>
        service.createPerformance({ ...BASE_PERFORMANCE, startTime: '11:00', endTime: '10:00' })
      ).toThrowError(/end time must be later/i);
    });

    it('should accept single-digit hour format (H:mm)', () => {
      const created = service.createPerformance({
        ...BASE_PERFORMANCE,
        startTime: '9:00',
        endTime: '10:00',
      });
      expect(created.id).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // createPerformance – overlap detection
  // ---------------------------------------------------------------------------
  describe('createPerformance – overlap detection', () => {
    it('should throw when a new performance overlaps an existing one (middle overlap)', () => {
      service.createPerformance(BASE_PERFORMANCE); // 10:00–11:00

      expect(() =>
        service.createPerformance({ ...BASE_PERFORMANCE, startTime: '10:30', endTime: '11:30' })
      ).toThrowError(/already booked/i);
    });

    it('should throw when a new performance fully contains an existing one', () => {
      service.createPerformance(BASE_PERFORMANCE); // 10:00–11:00

      expect(() =>
        service.createPerformance({ ...BASE_PERFORMANCE, startTime: '9:00', endTime: '12:00' })
      ).toThrowError(/already booked/i);
    });

    it('should throw when a new performance starts exactly when another ends (adjacent not allowed when start < end)', () => {
      // Adjacent slots (back-to-back) should NOT overlap: new start == existing end
      service.createPerformance(BASE_PERFORMANCE); // 10:00–11:00

      // 11:00 start is NOT an overlap (new start === existing end → no overlap)
      expect(() =>
        service.createPerformance({ ...BASE_PERFORMANCE, startTime: '11:00', endTime: '12:00' })
      ).not.toThrow();
    });

    it('should not throw when a new performance is on a different stage', () => {
      service.createPerformance(BASE_PERFORMANCE);

      expect(() =>
        service.createPerformance({ ...BASE_PERFORMANCE, stageName: 'Side Stage' })
      ).not.toThrow();
    });

    it('should not throw when a new performance is on a different date', () => {
      service.createPerformance(BASE_PERFORMANCE);

      expect(() =>
        service.createPerformance({ ...BASE_PERFORMANCE, date: '2026-09-02' })
      ).not.toThrow();
    });

    it('should not throw when a new performance is for a different festival', () => {
      service.createPerformance(BASE_PERFORMANCE);

      expect(() =>
        service.createPerformance({ ...BASE_PERFORMANCE, festivalId: 'fest-2' })
      ).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // createPerformance – happy path
  // ---------------------------------------------------------------------------
  describe('createPerformance – success', () => {
    it('should return the created performance with an assigned id', () => {
      const created = service.createPerformance(BASE_PERFORMANCE);

      expect(created.id).toBeDefined();
      expect(created.artistName).toBe(BASE_PERFORMANCE.artistName);
      expect(created.stageName).toBe(BASE_PERFORMANCE.stageName);
    });

    it('should persist the performance to storage', () => {
      service.createPerformance(BASE_PERFORMANCE);
      const all = service.getPerformancesByFestival(BASE_PERFORMANCE.festivalId);

      expect(all.length).toBe(1);
    });

    it('should return a copy so mutations do not affect stored data', () => {
      const created = service.createPerformance(BASE_PERFORMANCE);
      created.artistName = 'Mutated';
      const stored = service.getPerformancesByFestival(BASE_PERFORMANCE.festivalId);

      expect(stored[0].artistName).toBe(BASE_PERFORMANCE.artistName);
    });
  });

  // ---------------------------------------------------------------------------
  // isStageOccupied
  // ---------------------------------------------------------------------------
  describe('isStageOccupied', () => {
    it('should return false when no performances exist', () => {
      const occupied = service.isStageOccupied(
        BASE_PERFORMANCE.festivalId,
        BASE_PERFORMANCE.stageName,
        BASE_PERFORMANCE.date,
        '10:00',
        '11:00'
      );
      expect(occupied).toBe(false);
    });

    it('should return true when the slot overlaps an existing performance', () => {
      service.createPerformance(BASE_PERFORMANCE); // 10:00–11:00

      const occupied = service.isStageOccupied(
        BASE_PERFORMANCE.festivalId,
        BASE_PERFORMANCE.stageName,
        BASE_PERFORMANCE.date,
        '10:30',
        '11:30'
      );
      expect(occupied).toBe(true);
    });

    it('should return false for back-to-back adjacent slots', () => {
      service.createPerformance(BASE_PERFORMANCE); // 10:00–11:00

      // Starts exactly when the previous one ends
      const occupied = service.isStageOccupied(
        BASE_PERFORMANCE.festivalId,
        BASE_PERFORMANCE.stageName,
        BASE_PERFORMANCE.date,
        '11:00',
        '12:00'
      );
      expect(occupied).toBe(false);
    });

    it('should return false when excludeId matches the existing performance', () => {
      const created = service.createPerformance(BASE_PERFORMANCE);

      // Same slot but we're updating the same performance – should not conflict with itself
      const occupied = service.isStageOccupied(
        BASE_PERFORMANCE.festivalId,
        BASE_PERFORMANCE.stageName,
        BASE_PERFORMANCE.date,
        BASE_PERFORMANCE.startTime,
        BASE_PERFORMANCE.endTime,
        created.id
      );
      expect(occupied).toBe(false);
    });

    it('should return false with invalid time strings', () => {
      service.createPerformance(BASE_PERFORMANCE);
      const occupied = service.isStageOccupied(
        BASE_PERFORMANCE.festivalId,
        BASE_PERFORMANCE.stageName,
        BASE_PERFORMANCE.date,
        'bad',
        'times'
      );
      expect(occupied).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // deletePerformance
  // ---------------------------------------------------------------------------
  describe('deletePerformance', () => {
    it('should delete a performance and return true', () => {
      const created = service.createPerformance(BASE_PERFORMANCE);
      expect(service.deletePerformance(created.id)).toBe(true);
    });

    it('should remove the performance from storage', () => {
      const created = service.createPerformance(BASE_PERFORMANCE);
      service.deletePerformance(created.id);
      expect(service.getPerformancesByFestival(BASE_PERFORMANCE.festivalId).length).toBe(0);
    });

    it('should return false for a non-existent id', () => {
      expect(service.deletePerformance('nonexistent')).toBe(false);
    });
  });
});
