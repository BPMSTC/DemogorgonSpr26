import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StageCreateComponent } from './stage-create';
import { ReactiveFormsModule } from '@angular/forms';

describe('StageCreateComponent', () => {
  let component: StageCreateComponent;
  let fixture: ComponentFixture<StageCreateComponent  >;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StageCreateComponent],
      imports: [ReactiveFormsModule],
      providers: [provideRouter([])],

    }).compileComponents();

    fixture = TestBed.createComponent(StageCreateComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
