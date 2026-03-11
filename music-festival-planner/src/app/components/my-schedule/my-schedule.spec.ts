import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MySchedule } from './my-schedule';

describe('MySchedule', () => {
  let component: MySchedule;
  let fixture: ComponentFixture<MySchedule>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MySchedule],
      // We provide a fake ActivatedRoute here so the component can successfully build
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => '1' } } // Mocks the festival ID lookup
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MySchedule);
    component = fixture.componentInstance;
    
    // Trigger the initial data binding (ngOnInit)
    fixture.detectChanges(); 
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
