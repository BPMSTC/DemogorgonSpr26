import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { StageService } from './stage.service';
import { Stage } from '../models/stage.model';
import { environment } from '../../environments/environment';

const BASE_URL = `${environment.apiUrl}/api/stages`;

const STAGE_A: Stage = {
  id: 'a',
  festivalId: '99',
  name: 'Main Stage',
  capacity: 5000,
  environment: 'outdoor',
  status: 'active',
};

const STAGE_B: Stage = {
  id: 'b',
  festivalId: '99',
  name: 'Tent',
  capacity: 1000,
  environment: 'indoor',
  status: 'active',
};

describe('StageService', () => {
  let service: StageService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(StageService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('loadByFestival() should fetch and cache only requested festival stages', async () => {
    const p99 = firstValueFrom(service.loadByFestival('99'));
    httpMock.expectOne(`${BASE_URL}?festivalId=99`).flush([STAGE_A, STAGE_B]);
    await p99;

    expect(service.getStagesByFestival('99')).toEqual([STAGE_A, STAGE_B]);

    const other: Stage = { ...STAGE_A, id: 'c', festivalId: '88' };
    const p88 = firstValueFrom(service.loadByFestival('88'));
    httpMock.expectOne(`${BASE_URL}?festivalId=88`).flush([other]);
    await p88;

    expect(service.getStagesByFestival('99')).toEqual([STAGE_A, STAGE_B]);
    expect(service.getStagesByFestival('88')).toEqual([other]);
  });

  it('createStage() should post and append to cache', async () => {
    const input: Omit<Stage, 'id'> = {
      festivalId: STAGE_A.festivalId,
      name: STAGE_A.name,
      capacity: STAGE_A.capacity,
      environment: STAGE_A.environment,
      status: STAGE_A.status,
    };

    const promise = firstValueFrom(service.createStage(input));
    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush(STAGE_A);

    await expect(promise).resolves.toEqual(STAGE_A);
    expect(service.getStageById('a')).toEqual(STAGE_A);
  });

  it('deleteStage() should delete and remove from cache', async () => {
    const loadPromise = firstValueFrom(service.loadByFestival('99'));
    httpMock.expectOne(`${BASE_URL}?festivalId=99`).flush([STAGE_A]);
    await loadPromise;

    const deletePromise = firstValueFrom(service.deleteStage('a'));
    const req = httpMock.expectOne(`${BASE_URL}/a`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    await expect(deletePromise).resolves.toBeNull();
    expect(service.getStageById('a')).toBeUndefined();
  });

  it('clearStagesByFestival() should remove only that festival from cache', async () => {
    const p99 = firstValueFrom(service.loadByFestival('99'));
    httpMock.expectOne(`${BASE_URL}?festivalId=99`).flush([STAGE_A]);
    await p99;

    const other = { ...STAGE_B, id: 'x', festivalId: '88' };
    const p88 = firstValueFrom(service.loadByFestival('88'));
    httpMock.expectOne(`${BASE_URL}?festivalId=88`).flush([other]);
    await p88;

    const clearPromise = firstValueFrom(service.clearStagesByFestival('99'));
    const req = httpMock.expectOne(`${BASE_URL}/festival/99`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    await expect(clearPromise).resolves.toBeNull();
    expect(service.getStagesByFestival('99')).toEqual([]);
    expect(service.getStagesByFestival('88')).toEqual([other]);
  });
});
