import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NodeModelDetailPage } from './node-model-detail';

describe('NodeModelDetailPage', () => {
  let component: NodeModelDetailPage;
  let fixture: ComponentFixture<NodeModelDetailPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NodeModelDetailPage]
    })
      .compileComponents();

    fixture = TestBed.createComponent(NodeModelDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
