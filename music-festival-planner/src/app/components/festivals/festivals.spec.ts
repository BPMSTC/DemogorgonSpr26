import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { Festivals } from './festivals';
import { FestivalService } from '../../services/festival.service';

describe('Festivals', () => {
  let component: Festivals;
  let fixture: ComponentFixture<Festivals>;
  let festivalService: FestivalService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterModule.forRoot([])],
      declarations: [Festivals],
      providers: [FestivalService],
    }).compileComponents();

    festivalService = TestBed.inject(FestivalService);
    fixture = TestBed.createComponent(Festivals);
    component = fixture.componentInstance;
    // detectChanges is called per-test so each test controls its own data setup
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display festival cards for each festival in the service', () => {
    festivalService.createFestival({
      name: 'Test Fest',
      startDate: '2026-07-01',
      endDate: '2026-07-03',
      location: 'Austin, TX',
    });
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.card');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Test Fest');
    expect(cards[0].textContent).toContain('Austin, TX');
  });

  it('should show the empty-state message when no festivals exist', () => {
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('.empty-state');
    expect(emptyState).toBeTruthy();
    expect(emptyState.textContent).toContain('No festivals created yet');
  });

  it('should hide the empty-state message when festivals exist', () => {
    festivalService.createFestival({
      name: 'Rock Festival',
      startDate: '2026-09-05',
      endDate: '2026-09-07',
      location: 'Nashville, TN',
    });
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('.empty-state');
    expect(emptyState).toBeFalsy();
  });

  it('should display name, start date, end date, and location for each festival', () => {
    festivalService.createFestival({
      name: 'Jazz Fest',
      startDate: '2026-05-01',
      endDate: '2026-05-04',
      location: 'New Orleans, LA',
    });
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.card');
    expect(card.textContent).toContain('Jazz Fest');
    expect(card.textContent).toContain('2026-05-01');
    expect(card.textContent).toContain('2026-05-04');
    expect(card.textContent).toContain('New Orleans, LA');
  });
});
