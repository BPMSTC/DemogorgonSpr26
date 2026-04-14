import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { ScheduleService } from './schedule.service';
import { Performance } from '../models/performance.model';
import { environment } from '../../environments/environment';

const BASE_URL = `${environment.apiUrl}/api/performances`;

const BASE_INPUT: Omit<Performance, 'id'> = {
  festivalId: '99',
  artistName: 'Test Artist',
  stageName: 'Main Stage',
  date: '2026-09-01',
  startTime: '12:00',
  endTime: '13:00',
};

describe('ScheduleService', () => {
  let service: ScheduleService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ScheduleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('loadByFestival() should fetch and merge by festival', async () => {
    const p99: Performance = { id: '1', ...BASE_INPUT };
    const p88: Performance = { ...p99, id: '2', festivalId: '88' };

    const load99 = firstValueFrom(service.loadByFestival('99'));
    httpMock.expectOne(`${BASE_URL}?festivalId=99`).flush([p99]);
    await load99;

    const load88 = firstValueFrom(service.loadByFestival('88'));
    httpMock.expectOne(`${BASE_URL}?festivalId=88`).flush([p88]);
    await load88;

    expect(service.getPerformancesByFestival('99')).toEqual([p99]);
    expect(service.getPerformancesByFestival('88')).toEqual([p88]);
  });

  it('getPerformancesByFestival() should return copies', async () => {
    const p99: Performance = { id: '1', ...BASE_INPUT };

    const load = firstValueFrom(service.loadByFestival('99'));
    httpMock.expectOne(`${BASE_URL}?festivalId=99`).flush([p99]);
    await load;

    const list = service.getPerformancesByFestival('99');
    list[0].artistName = 'Mutated';

    expect(service.getPerformancesByFestival('99')[0].artistName).toBe('Test Artist');
  });

  it('createPerformance() should reject invalid time format', async () => {
    await expect(
      firstValueFrom(service.createPerformance({ ...BASE_INPUT, startTime: 'noon' })),
    ).rejects.toThrow('Start and end times must be valid 24-hour times');
  });

  it('createPerformance() should reject when end is not after start', async () => {
    await expect(
      firstValueFrom(
        service.createPerformance({ ...BASE_INPUT, startTime: '14:00', endTime: '14:00' }),
      ),
    ).rejects.toThrow('End time must be later than start time.');
  });

  it('createPerformance() should reject stage overlap', async () => {
    const existing: Performance = { id: 'e1', ...BASE_INPUT };
    const load = firstValueFrom(service.loadByFestival('99'));
    httpMock.expectOne(`${BASE_URL}?festivalId=99`).flush([existing]);
    await load;

    await expect(
      firstValueFrom(
        service.createPerformance({
          ...BASE_INPUT,
          artistName: 'Other',
          startTime: '12:30',
          endTime: '13:30',
        }),
      ),
    ).rejects.toThrow('already booked during that time slot');
  });

  it('createPerformance() should post and append to signal state', async () => {
    const created: Performance = { id: 'c1', ...BASE_INPUT };

    const promise = firstValueFrom(service.createPerformance(BASE_INPUT));
    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(BASE_INPUT);
    req.flush(created);

    await expect(promise).resolves.toEqual(created);
    expect(service.getPerformancesByFestival('99')).toEqual([created]);
  });

  it('deletePerformance() should delete and remove from state', async () => {
    const existing: Performance = { id: 'd1', ...BASE_INPUT };
    const load = firstValueFrom(service.loadByFestival('99'));
    httpMock.expectOne(`${BASE_URL}?festivalId=99`).flush([existing]);
    await load;

    const del = firstValueFrom(service.deletePerformance('d1'));
    const req = httpMock.expectOne(`${BASE_URL}/d1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    await expect(del).resolves.toBeNull();
    expect(service.getPerformancesByFestival('99')).toEqual([]);
  });

  it('clearPerformancesByFestival() should delete all for one festival', async () => {
    const p99: Performance = { id: '1', ...BASE_INPUT };
    const p88: Performance = { ...p99, id: '2', festivalId: '88' };

    const load99 = firstValueFrom(service.loadByFestival('99'));
    httpMock.expectOne(`${BASE_URL}?festivalId=99`).flush([p99]);
    await load99;

    const load88 = firstValueFrom(service.loadByFestival('88'));
    httpMock.expectOne(`${BASE_URL}?festivalId=88`).flush([p88]);
    await load88;

    const clear = firstValueFrom(service.clearPerformancesByFestival('99'));
    const req = httpMock.expectOne(`${BASE_URL}/festival/99`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    await expect(clear).resolves.toBeNull();
    expect(service.getPerformancesByFestival('99')).toEqual([]);
    expect(service.getPerformancesByFestival('88')).toEqual([p88]);
  });
});
