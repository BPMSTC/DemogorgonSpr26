import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StageCreateComponent } from './stage-create';

describe('StageCreateComponent', () => {
  let component: StageCreateComponent;
  let fixture: ComponentFixture<StageCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StageCreateComponent],
      imports: [CommonModule, ReactiveFormsModule, RouterModule.forRoot([])],
    }).compileComponents();

    fixture = TestBed.createComponent(StageCreateComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
