import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class JikanAPI {
  private readonly providers = [
    'https://api.jikan.moe/v4',
    'https://api.tenrai.org/v1',
    'https://jikan.lucashdo.com/v1',
  ];
  private readonly http = inject(HttpClient);
  private readonly currentYear = new Date().getFullYear();
  private readonly currentSeason = this.getCurrentSeason();

  private getCurrentSeason(): Season {
    const month = new Date().getMonth();
    if (month >= 0 && month <= 2) return Season.Winter;
    if (month >= 3 && month <= 5) return Season.Spring;
    if (month >= 6 && month <= 8) return Season.Summer;
    return Season.Fall;
  }

  getSeasonLabel(): string {
    const translated = {
      [Season.Winter]: 'Winter',
      [Season.Spring]: 'Spring',
      [Season.Summer]: 'Summer',
      [Season.Fall]: 'Fall',
    };
    return `${translated[this.currentSeason]} ${this.currentYear}`;
  }

  getAnimeRecommendations(animeId: number): Observable<Anime[]> {
    return this.get<{ data: Array<{ entry: AnimeApiModel[] }> }>(`/anime/${animeId}/recommendations`).pipe(
      map((response) =>
        response.data
          .flatMap((item) => item.entry)
          .filter((entry): entry is AnimeApiModel => !!entry?.mal_id)
          .map((entry) => this.mapAnime(entry)),
      ),
    );
  }

  getSeasonalAnime(
    season: Season = this.currentSeason,
    page: number = 1,
    sfw: boolean = true,
  ): Observable<Pagination<Anime[]>> {
    return this.get<{ pagination: PaginationMeta; data: AnimeApiModel[] }>(
      `/seasons/${this.currentYear}/${season}`,
      { page, sfw },
    ).pipe(
      map((res) => ({
        ...res.pagination,
        animes: res.data.map((anime) => this.mapAnime(anime)),
      })),
    );
  }

  getAnimeById(id: number): Observable<Anime> {
    return this.get<{ data: AnimeApiModel }>(`/anime/${id}/full`).pipe(
      map((res) => this.mapAnime(res.data)),
    );
  }

  searchAnime(query: string): Observable<Anime[]> {
    return this.get<{ data: AnimeApiModel[] }>('/anime', { q: query }).pipe(
      map((res) => res.data.map((anime) => this.mapAnime(anime))),
    );
  }

  private get<T>(
    path: string,
    params?: Record<string, string | number | boolean>,
  ): Observable<T> {
    return this.getFromProvider<T>(path, params, 0);
  }

  private getFromProvider<T>(
    path: string,
    params: Record<string, string | number | boolean> | undefined,
    providerIndex: number,
  ): Observable<T> {
    return this.http.get<T>(`${this.providers[providerIndex]}${path}`, { params }).pipe(
      catchError((error) => {
        const nextProviderIndex = providerIndex + 1;
        if (nextProviderIndex >= this.providers.length) {
          return throwError(() => error);
        }

        return this.getFromProvider<T>(path, params, nextProviderIndex);
      }),
    );
  }

  private mapAnime(anime: AnimeApiModel): Anime {
    return {
      mal_id: anime.mal_id,
      url: anime.url,
      trailer: anime.trailer,
      title: anime.title,
      title_english: anime.title_english,
      title_japanese: anime.title_japanese,
      type: anime.type,
      episodes: anime.episodes,
      status: anime.status,
      score: anime.score,
      synopsis: anime.synopsis,
      year: anime.year,
      season: anime.season,
      rating: anime.rating,
      duration: anime.duration,
      images: {
        jpg: {
          image_url: anime.images?.jpg?.image_url ?? '',
          large_image_url: anime.images?.jpg?.large_image_url,
        },
        webp: {
          image_url: anime.images?.webp?.image_url,
          large_image_url: anime.images?.webp?.large_image_url,
        },
      },
      genres: anime.genres ?? [],
      studios: anime.studios ?? [],
      producers: anime.producers ?? [],
    };
  }
}

interface AnimeApiModel {
  mal_id: number;
  url: string;
  trailer?: {
    youtube_id?: string;
    url?: string;
    embed_url?: string;
  };
  title: string;
  title_english?: string;
  title_japanese?: string;
  type?: string;
  episodes?: number;
  status?: string;
  score?: number;
  synopsis?: string;
  year?: number;
  season?: string;
  rating?: string;
  duration?: string;
  images?: {
    jpg?: {
      image_url?: string;
      large_image_url?: string;
    };
    webp?: {
      image_url?: string;
      large_image_url?: string;
    };
  };
  genres?: Genre[];
  studios?: Studio[];
  producers?: Studio[];
}

interface PaginationMeta {
  last_visible_page: number;
  has_next_page: boolean;
  current_page: number;
  items: {
    count: number;
    total: number;
    per_page: number;
  };
}

export interface Genre {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

export interface Studio {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

export interface Pagination<T> {
  last_visible_page: number;
  has_next_page: boolean;
  current_page: number;
  items: {
    count: number;
    total: number;
    per_page: number;
  };
  animes: T;
}

export enum Season {
  Winter = 'winter',
  Spring = 'spring',
  Summer = 'summer',
  Fall = 'fall',
}

export interface Anime {
  mal_id: number;
  url: string;
  trailer?: {
    youtube_id?: string;
    url?: string;
    embed_url?: string;
  };
  title: string;
  title_english?: string;
  title_japanese?: string;
  type?: string;
  episodes?: number;
  status?: string;
  score?: number;
  synopsis?: string;
  year?: number;
  season?: string;
  rating?: string;
  duration?: string;
  images: {
    jpg: {
      image_url: string;
      large_image_url?: string;
    };
    webp: {
      image_url?: string;
      large_image_url?: string;
    };
  };
  genres: Genre[];
  studios: Studio[];
  producers: Studio[];
}
