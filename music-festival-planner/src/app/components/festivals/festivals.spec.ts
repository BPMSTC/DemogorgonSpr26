import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Festivals } from './festivals';

describe('Festivals', () => {
  let component: Festivals;
  let fixture: ComponentFixture<Festivals>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Festivals],
    }).compileComponents();

    fixture = TestBed.createComponent(Festivals);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
