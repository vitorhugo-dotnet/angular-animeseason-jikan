import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { JikanAPI, Season } from './jikan-api';

describe('JikanAPI', () => {
  let service: JikanAPI;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), JikanAPI],
    });
    service = TestBed.inject(JikanAPI);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('falls back through the configured providers when a seasonal request fails', () => {
    let receivedTitles: string[] | undefined;

    service.getSeasonalAnime(Season.Summer).subscribe((response) => {
      receivedTitles = response.animes.map((anime) => anime.title);
    });

    httpTesting
      .expectOne((request) =>
        request.url.startsWith('https://api.jikan.moe/v4/seasons/'),
      )
      .flush('', { status: 504, statusText: 'Gateway Time-out' });

    httpTesting
      .expectOne((request) =>
        request.url.startsWith('https://api.tenrai.org/v1/seasons/'),
      )
      .flush('', { status: 503, statusText: 'Service Unavailable' });

    httpTesting
      .expectOne((request) =>
        request.url.startsWith('https://jikan.lucashdo.com/v1/seasons/'),
      )
      .flush({
        pagination: {
          last_visible_page: 1,
          has_next_page: false,
          current_page: 1,
          items: { count: 1, total: 1, per_page: 25 },
        },
        data: [{ mal_id: 1, url: '', title: 'Fallback anime', images: { jpg: { image_url: '' } } }],
      });

    expect(receivedTitles).toEqual(['Fallback anime']);
  });
});
