import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Anime } from './anime';

describe('Anime', () => {
  let component: Anime;
  let fixture: ComponentFixture<Anime>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Anime],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Anime);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
