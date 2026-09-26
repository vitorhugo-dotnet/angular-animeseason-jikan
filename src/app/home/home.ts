import { AsyncPipe } from '@angular/common';
import {
  Component,
  signal,
  inject,
  OnInit,
  Signal,
  WritableSignal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { JikanAPI, Anime, Season, SeasonSelection } from '../services/data/jikan-api';
import { BehaviorSubject, exhaustMap, finalize, Observable, scan, switchMap, tap } from 'rxjs';
import { IntersectDirective } from '../directives/intersect.directive';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, IntersectDirective, RouterLink],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  title: Signal<string> = signal('Seasonal Anime');
  private titleService: Title = inject(Title);
  private jikanAPI = inject(JikanAPI);
  private readonly currentSeason = this.jikanAPI.getCurrentSeasonSelection();
  selectedSeason: WritableSignal<SeasonSelection> = signal(this.currentSeason);
  currentSeasonLabel: WritableSignal<string> = signal(
    this.jikanAPI.getSeasonLabel(this.currentSeason.year, this.currentSeason.season),
  );
  seasonOptions = this.buildSeasonOptions();
  private selectedSeason$ = new BehaviorSubject<SeasonSelection>(this.currentSeason);
  private page$ = new BehaviorSubject<number>(1);
  hasNextPage = signal(true);
  // Cada troca de temporada recria o fluxo de páginas e limpa os cards anteriores.
  anime$: Observable<Anime[]> = this.selectedSeason$.pipe(
    switchMap((selection) => {
      this.page$ = new BehaviorSubject<number>(1);
      this.hasNextPage.set(true);

      return this.page$.pipe(
        exhaustMap((page) => {
          this.loading.set(true);
          return this.jikanAPI.getSeasonalAnime(selection.season, page, true, selection.year).pipe(
            tap((pagination) => this.hasNextPage.set(pagination.has_next_page)),
            finalize(() => this.loading.set(false)),
          );
        }),
        scan((acc, curr) => {
          const keys = new Set(
            acc.map((anime) => `${anime.mal_id}-${anime.title.trim().toLowerCase()}`),
          );
          const next = curr.animes.filter((anime) => {
            const key = `${anime.mal_id}-${anime.title.trim().toLowerCase()}`;
            if (keys.has(key)) {
              return false;
            }
            keys.add(key);
            return true;
          });
          return [...acc, ...next];
        }, [] as Anime[]),
      );
    }),
  );
  loading = signal(false);

  // Define o titulo da pagina e aciona a primeira busca ao iniciar o componente.
  ngOnInit(): void {
    this.titleService.setTitle(this.title());
  }

  private buildSeasonOptions(): Array<SeasonSelection & { key: string; label: string }> {
    const seasons = [Season.Winter, Season.Spring, Season.Summer, Season.Fall];
    return [
      this.currentSeason.year - 1,
      this.currentSeason.year,
      this.currentSeason.year + 1,
    ].flatMap((year) =>
      seasons.map((season) => ({
        year,
        season,
        key: `${year}-${season}`,
        label: this.jikanAPI.getSeasonLabel(year, season),
      })),
    );
  }

  isSelectedSeason(option: SeasonSelection): boolean {
    return (
      this.selectedSeason().year === option.year && this.selectedSeason().season === option.season
    );
  }

  selectSeason(option: SeasonSelection): void {
    if (this.isSelectedSeason(option)) {
      return;
    }

    this.selectedSeason.set(option);
    this.currentSeasonLabel.set(this.jikanAPI.getSeasonLabel(option.year, option.season));
    this.selectedSeason$.next(option);
  }

  // Solicita a proxima pagina; o fluxo reativo faz o restante.
  loadMore() {
    if (this.loading() || !this.hasNextPage()) {
      return;
    }

    this.page$.next(this.page$.value + 1);
  }

  // Reduz textos longos para manter o card compacto na interface.
  ellipsis(value: string, limit: number = 100): string {
    if (value.length <= limit) {
      return value;
    }
    return value.substring(0, limit) + '...';
  }

  cardImage(anime: Anime): string {
    return (
      anime.images.webp.large_image_url ||
      anime.images.jpg.large_image_url ||
      anime.images.jpg.image_url
    );
  }

  score(anime: Anime): string {
    return anime.score ? anime.score.toFixed(1) : 'N/A';
  }

  nextEpisodeDate(anime: Anime): string {
    if (anime.status !== 'Currently Airing') {
      return 'Schedule TBA';
    }

    const { day, time, timezone } = anime.broadcast ?? {};
    const weekday = day?.replace(/s$/i, '').toLowerCase();
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetWeekday = weekdays.indexOf(weekday ?? '');
    const timeMatch = time?.match(/^(\d{1,2}):(\d{2})$/);

    if (targetWeekday < 0 || !timeMatch || !timezone) {
      return 'Schedule TBA';
    }

    try {
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'long',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: 'h23',
      }).formatToParts(now);
      const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
      const currentWeekday = weekdays.indexOf((part('weekday') ?? '').toLowerCase());
      const hour = Number(part('hour'));
      const minute = Number(part('minute'));
      const daysUntil = (targetWeekday - currentWeekday + 7) % 7;
      const scheduledTimePassed = hour > Number(timeMatch[1]) ||
        (hour === Number(timeMatch[1]) && minute >= Number(timeMatch[2]));
      const addDays = daysUntil + (daysUntil === 0 && scheduledTimePassed ? 7 : 0);
      const scheduledDate = new Date(Date.UTC(
        Number(part('year')),
        Number(part('month')) - 1,
        Number(part('day')) + addDays,
      ));

      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(scheduledDate);
    } catch {
      return 'Schedule TBA';
    }
  }

  genre(anime: Anime, index: number): string {
    return anime.genres[index]?.name || (index === 0 ? 'Anime' : 'Series');
  }
}
