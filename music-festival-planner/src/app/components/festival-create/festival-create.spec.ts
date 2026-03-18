import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { FestivalCreateComponent } from './festival-create';
import { FestivalService } from '../../services/festival.service';

describe('FestivalCreateComponent', () => {
  let component: FestivalCreateComponent;
  let fixture: ComponentFixture<FestivalCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, ReactiveFormsModule, RouterModule.forRoot([])],
      declarations: [FestivalCreateComponent],
      providers: [FestivalService],
    }).compileComponents();

    fixture = TestBed.createComponent(FestivalCreateComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('endDate cross-field validation', () => {
    it('should be invalid when endDate is before startDate', () => {
      component.festivalForm.setValue({
        name: 'Test Festival',
        startDate: '2025-08-04',
        endDate: '2025-08-01',
        location: 'Chicago',
      });
      expect(component.festivalForm.errors?.['endBeforeStart']).toBeTruthy();
    });

    it('should be valid when endDate equals startDate', () => {
      component.festivalForm.setValue({
        name: 'Test Festival',
        startDate: '2025-08-01',
        endDate: '2025-08-01',
        location: 'Chicago',
      });
      expect(component.festivalForm.errors).toBeNull();
    });

    it('should be valid when endDate is after startDate', () => {
      component.festivalForm.setValue({
        name: 'Test Festival',
        startDate: '2025-08-01',
        endDate: '2025-08-04',
        location: 'Chicago',
      });
      expect(component.festivalForm.errors).toBeNull();
    });

    it('should not produce endBeforeStart error when dates are empty', () => {
      component.festivalForm.setValue({
        name: 'Test Festival',
        startDate: '',
        endDate: '',
        location: 'Chicago',
      });
      expect(component.festivalForm.errors?.['endBeforeStart']).toBeFalsy();
    });
  });
});

