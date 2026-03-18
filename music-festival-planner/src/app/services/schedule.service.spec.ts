import { TestBed } from '@angular/core/testing';
import { ScheduleService } from './schedule.service';
import { Performance } from '../models/performance.model';

/** Typed fixture — no field may be missing or mistyped. */
const BASE: Omit<Performance, 'id'> = {
  festivalId: '99',
  artistName: 'Test Artist',
  stageName: 'Test Stage',
  date: '2026-09-01',
  startTime: '12:00',
  endTime: '13:00',
};

describe('ScheduleService', () => {
  let service: ScheduleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScheduleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // getPerformancesByFestival
  // ---------------------------------------------------------------------------
  describe('getPerformancesByFestival', () => {
    it('returns only performances for the requested festival', () => {
      const results: Performance[] = service.getPerformancesByFestival('1');
      results.forEach(p => expect(p.festivalId).toBe('1'));
    });

    it('returns an empty array for an unknown festival id', () => {
      expect(service.getPerformancesByFestival('unknown')).toEqual([]);
    });

    it('returns copies — mutating the result does not affect stored data', () => {
      service.createPerformance({ ...BASE });
      const first = service.getPerformancesByFestival('99');
      first[0].artistName = 'Mutated';
      const second = service.getPerformancesByFestival('99');
      expect(second[0].artistName).toBe('Test Artist');
    });
  });

  // ---------------------------------------------------------------------------
  // createPerformance
  // ---------------------------------------------------------------------------
  describe('createPerformance', () => {
    it('assigns an id and returns a typed Performance', () => {
      const result = service.createPerformance({ ...BASE });
      // TypeScript narrows: if result has an `error` key it is an error object.
      if ('error' in result) {
        throw new Error('Expected a Performance but got an error: ' + result.error);
      }
      const perf: Performance = result;
      expect(perf.id).toBeDefined();
      expect(perf.artistName).toBe(BASE.artistName);
      expect(perf.stageName).toBe(BASE.stageName);
      expect(perf.date).toBe(BASE.date);
      expect(perf.startTime).toBe(BASE.startTime);
      expect(perf.endTime).toBe(BASE.endTime);
    });

    it('persists the new performance so it appears in getPerformancesByFestival', () => {
      service.createPerformance({ ...BASE });
      expect(service.getPerformancesByFestival('99').length).toBe(1);
    });

    it('returns an error when end time is not after start time', () => {
      const result = service.createPerformance({ ...BASE, startTime: '14:00', endTime: '13:00' });
      expect('error' in result).toBe(true);
    });

    it('returns an error when times are equal', () => {
      const result = service.createPerformance({ ...BASE, startTime: '12:00', endTime: '12:00' });
      expect('error' in result).toBe(true);
    });

    it('returns an error for an invalid time format', () => {
      const result = service.createPerformance({ ...BASE, startTime: 'noon', endTime: '13:00' });
      expect('error' in result).toBe(true);
    });

    it('returns an error when the stage is already booked during that slot', () => {
      service.createPerformance({ ...BASE });
      const overlap = service.createPerformance({ ...BASE, artistName: 'Other Artist' });
      expect('error' in overlap).toBe(true);
    });

    it('allows a second performance on the same stage in a non-overlapping slot', () => {
      service.createPerformance({ ...BASE });
      const result = service.createPerformance({ ...BASE, startTime: '13:00', endTime: '14:00' });
      expect('error' in result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // deletePerformance
  // ---------------------------------------------------------------------------
  describe('deletePerformance', () => {
    it('removes the performance and returns true', () => {
      const created = service.createPerformance({ ...BASE }) as Performance;
      expect(service.deletePerformance(created.id)).toBe(true);
      expect(service.getPerformancesByFestival('99').length).toBe(0);
    });

    it('returns false for an unknown id', () => {
      expect(service.deletePerformance('nonexistent')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // isStageOccupied
  // ---------------------------------------------------------------------------
  describe('isStageOccupied', () => {
    it('returns false when no performances exist', () => {
      expect(service.isStageOccupied('99', 'Test Stage', '2026-09-01', '10:00', '11:00')).toBe(false);
    });

    it('returns true for an exact time overlap', () => {
      service.createPerformance({ ...BASE });
      expect(service.isStageOccupied('99', 'Test Stage', '2026-09-01', '12:00', '13:00')).toBe(true);
    });

    it('returns true for a partial overlap', () => {
      service.createPerformance({ ...BASE });
      expect(service.isStageOccupied('99', 'Test Stage', '2026-09-01', '12:30', '13:30')).toBe(true);
    });

    it('returns false for an adjacent slot (no overlap)', () => {
      service.createPerformance({ ...BASE });
      expect(service.isStageOccupied('99', 'Test Stage', '2026-09-01', '13:00', '14:00')).toBe(false);
    });

    it('returns false for a different stage', () => {
      service.createPerformance({ ...BASE });
      expect(service.isStageOccupied('99', 'Other Stage', '2026-09-01', '12:00', '13:00')).toBe(false);
    });

    it('returns false for a different date', () => {
      service.createPerformance({ ...BASE });
      expect(service.isStageOccupied('99', 'Test Stage', '2026-09-02', '12:00', '13:00')).toBe(false);
    });
  });
});
