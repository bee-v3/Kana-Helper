import { TestBed } from '@angular/core/testing';

import { KanaSelectorService } from './kana-selector.service';

describe('KanaSelectorService', () => {
  let service: KanaSelectorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(KanaSelectorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
