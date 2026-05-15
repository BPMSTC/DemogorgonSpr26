import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { FestivalService } from './festival.service';
import { Festival } from '../models/festival.model';
import { environment } from '../environments/environment';

const BASE_URL = `${environment.apiUrl}/api/festivals`;

const SAMPLE_DATA: Omit<Festival, 'id'> = {
  name: 'Lollapalooza',
  startDate: '2026-08-01',
  endDate: '2026-08-04',
  location: 'Chicago, IL',
  genre: 'Rock',
  capacity: 100000,
};

describe('FestivalService', () => {
  let service: FestivalService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(FestivalService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('load() should fetch and cache festivals', async () => {
    const expected: Festival[] = [{ id: '1', ...SAMPLE_DATA }];

    const promise = firstValueFrom(service.load());
    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.method).toBe('GET');
    req.flush(expected);

    await expect(promise).resolves.toEqual(expected);
    expect(service.getFestivals()).toEqual(expected);
    expect(service.getFestivalById('1')).toEqual(expected[0]);
  });

  it('loadById() should fetch one festival and cache it', async () => {
    const expected: Festival = { id: '1', ...SAMPLE_DATA };

    const promise = firstValueFrom(service.loadById('1'));
    const req = httpMock.expectOne(`${BASE_URL}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(expected);

    await expect(promise).resolves.toEqual(expected);
    expect(service.getFestivalById('1')).toEqual(expected);
  });

  it('should return cloned festivals from synchronous reads', async () => {
    const expected: Festival[] = [{ id: '1', ...SAMPLE_DATA }];

    const loadPromise = firstValueFrom(service.load());
    httpMock.expectOne(BASE_URL).flush(expected);
    await loadPromise;

    const list = service.getFestivals();
    const byId = service.getFestivalById('1');
    list[0].name = 'Mutated';
    if (byId) {
      byId.name = 'Mutated too';
    }

    expect(service.getFestivals()[0].name).toBe(SAMPLE_DATA.name);
    expect(service.getFestivalById('1')?.name).toBe(SAMPLE_DATA.name);
  });

  it('createFestival() should post and append to cache', async () => {
    const created: Festival = { id: '99', ...SAMPLE_DATA };

    const promise = firstValueFrom(service.createFestival(SAMPLE_DATA));
    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(SAMPLE_DATA);
    req.flush(created);

    await expect(promise).resolves.toEqual(created);
    expect(service.getFestivalById('99')).toEqual(created);
  });

  it('updateFestival() should patch and update cached item', async () => {
    const existing: Festival = { id: '1', ...SAMPLE_DATA };

    const loadPromise = firstValueFrom(service.load());
    httpMock.expectOne(BASE_URL).flush([existing]);
    await loadPromise;

    const updated: Festival = { ...existing, name: 'Updated Name' };
    const updatePromise = firstValueFrom(service.updateFestival('1', { name: 'Updated Name' }));

    const req = httpMock.expectOne(`${BASE_URL}/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'Updated Name' });
    req.flush(updated);

    await expect(updatePromise).resolves.toEqual(updated);
    expect(service.getFestivalById('1')?.name).toBe('Updated Name');
  });

  it('deleteFestival() should delete and remove from cache', async () => {
    const existing: Festival = { id: '1', ...SAMPLE_DATA };

    const loadPromise = firstValueFrom(service.load());
    httpMock.expectOne(BASE_URL).flush([existing]);
    await loadPromise;

    const deletePromise = firstValueFrom(service.deleteFestival('1'));
    const req = httpMock.expectOne(`${BASE_URL}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    await expect(deletePromise).resolves.toBeNull();
    expect(service.getFestivalById('1')).toBeUndefined();
    expect(service.getFestivals()).toEqual([]);
  });

  it('should surface API error messages', async () => {
    const promise = firstValueFrom(service.load());
    const req = httpMock.expectOne(BASE_URL);
    req.flush({ message: 'Backend exploded' }, { status: 500, statusText: 'Server Error' });

    await expect(promise).rejects.toThrow('Backend exploded');
  });
});
