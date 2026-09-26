import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Home } from './home';
import { JikanAPI, Season } from '../services/data/jikan-api';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let jikanAPI: { getSeasonalAnime: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    jikanAPI = {
      getSeasonLabel: vi.fn(
        (year: number, season: Season) => `${season[0].toUpperCase()}${season.slice(1)} ${year}`,
      ),
      getCurrentSeasonSelection: vi.fn(() => ({ year: 2026, season: Season.Fall })),
      getSeasonalAnime: vi.fn(() => of({ has_next_page: true, animes: [] })),
    } as never;

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([]), { provide: JikanAPI, useValue: jikanAPI }],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows season chips for the previous, current, and following year', () => {
    fixture.detectChanges();

    const chips: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('[aria-label="Season navigation"] button'),
    );

    expect(chips).toHaveLength(12);
    expect(chips.map((chip) => chip.textContent?.trim())).toContain('Winter 2025');
    expect(chips.map((chip) => chip.textContent?.trim())).toContain('Fall 2026');
    expect(chips.map((chip) => chip.textContent?.trim())).toContain('Winter 2027');
    expect(
      chips.find((chip) => chip.textContent?.trim() === 'Fall 2026')?.getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('loads the selected season and year from the first page', () => {
    fixture.detectChanges();
    component.loadMore();
    const previousWinter: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[aria-label="Season navigation"] button',
    );

    previousWinter.click();
    fixture.detectChanges();

    expect(jikanAPI.getSeasonalAnime).toHaveBeenLastCalledWith(Season.Winter, 1, true, 2025);
  });
});
