import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SensorChanelDetail } from './sensor-chanel-detail';

describe('SensorChanelDetail', () => {
  let component: SensorChanelDetail;
  let fixture: ComponentFixture<SensorChanelDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SensorChanelDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SensorChanelDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
