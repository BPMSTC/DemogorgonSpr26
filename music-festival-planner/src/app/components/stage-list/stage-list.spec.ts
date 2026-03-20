import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StageListComponent } from './stage-list';

describe('StageListComponent', () => {
  let component: StageListComponent;
  let fixture: ComponentFixture<StageListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StageListComponent],
      imports: [CommonModule, RouterModule.forRoot([])],
    }).compileComponents();

    fixture = TestBed.createComponent(StageListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
