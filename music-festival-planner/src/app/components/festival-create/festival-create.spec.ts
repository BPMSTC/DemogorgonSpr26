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
});
