import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { Festivals } from './festivals';
import { FestivalService } from '../../services/festival.service';

describe('Festivals', () => {
  let component: Festivals;
  let fixture: ComponentFixture<Festivals>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterModule.forRoot([])],
      declarations: [Festivals],
      providers: [FestivalService],
    }).compileComponents();

    fixture = TestBed.createComponent(Festivals);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
