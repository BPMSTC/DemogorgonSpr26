import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
import { Festivals } from './festivals';
import { FestivalService } from '../../services/festival.service';
import { Festival } from '../../models/festival.model';

describe('Festivals', () => {
  let component: Festivals;
  let fixture: ComponentFixture<Festivals>;
  let festivalService: FestivalService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Festivals],
      imports: [CommonModule],
    }).compileComponents();

    festivalService = TestBed.inject(FestivalService);
    // Clear seeded mock data for controlled tests
    festivalService.getFestivals().forEach((f) => festivalService.deleteFestival(f.id));

    fixture = TestBed.createComponent(Festivals);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show empty state message when there are no festivals', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    const emptyState = fixture.debugElement.query(By.css('.empty-state'));
    expect(emptyState).toBeTruthy();
    expect(emptyState.nativeElement.textContent).toContain('No festivals found');
  });

  it('should not show the table when there are no festivals', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    const table = fixture.debugElement.query(By.css('.festivals-table'));
    expect(table).toBeNull();
  });

  it('should display a row for each festival', async () => {
    festivalService.createFestival({
      name: 'Test Fest',
      startDate: '2025-07-01',
      endDate: '2025-07-03',
      location: 'Austin, TX',
      genre: 'Electronic',
      capacity: 50000,
    });

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
    expect(rows.length).toBe(1);
  });

  it('should display festival name, startDate, endDate, and location in each row', async () => {
    const festival: Omit<Festival, 'id'> = {
      name: 'SoundStorm',
      startDate: '2025-12-05',
      endDate: '2025-12-07',
      location: 'Riyadh, SA',
      genre: 'Electronic',
      capacity: 200000,
    };
    festivalService.createFestival(festival);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const row = fixture.debugElement.query(By.css('tbody tr'));
    const cells = row.queryAll(By.css('td'));

    expect(cells[0].nativeElement.textContent).toContain('SoundStorm');
    expect(cells[1].nativeElement.textContent).toContain('2025-12-05');
    expect(cells[2].nativeElement.textContent).toContain('2025-12-07');
    expect(cells[3].nativeElement.textContent).toContain('Riyadh, SA');
  });

  it('should hide empty state and show table when festivals exist', async () => {
    festivalService.createFestival({
      name: 'Fest',
      startDate: '2025-06-01',
      endDate: '2025-06-02',
      location: 'Denver, CO',
      genre: 'Country',
      capacity: 30000,
    });

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const emptyState = fixture.debugElement.query(By.css('.empty-state'));
    const table = fixture.debugElement.query(By.css('.festivals-table'));

    expect(emptyState).toBeNull();
    expect(table).toBeTruthy();
  });
});
