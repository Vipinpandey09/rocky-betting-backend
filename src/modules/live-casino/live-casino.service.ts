type LiveCasinoGame = {
  slug: string;
  name?: string;
  title?: string;
  provider?: string;
  category?: string;
  image?: string;
  stats?: {
    d30?: {
      lcfi_score?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type LiveCasinoGamesResponse = {
  games?: LiveCasinoGame[];
  [key: string]: unknown;
};

type LiveCasinoGameResponse = {
  game?: LiveCasinoGame;
  [key: string]: unknown;
};

type LiveCasinoStatsResponse = {
  [key: string]: unknown;
};

type LiveCasinoFairnessResponse = {
  platform_lcfi?: number;
  games?: Array<{
    slug?: string;
    name?: string;
    lcfi_score?: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

const BASE = "https://livecasinodata.com/api/v1";
const TTL = 5 * 60_000;

type CacheEntry<T> = { fetchedAt: number; data: T };

class LiveCasinoDataService {
  private cache = new Map<string, CacheEntry<unknown>>();

  private async fetchJson<T>(path: string): Promise<T> {
    const response = await fetch(`${BASE}${path}`);
    if (!response.ok) {
      throw new Error(`LiveCasinoData HTTP ${response.status} for ${path}`);
    }
    return response.json() as Promise<T>;
  }

  private async cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.fetchedAt < TTL) {
      return cached.data;
    }

    const data = await loader();
    this.cache.set(key, { fetchedAt: Date.now(), data });
    return data;
  }

  async getGames(window = "30d") {
    return this.cached(`games:${window}`, async () => {
      try {
        const json = await this.fetchJson<LiveCasinoGamesResponse>(`/games?window=${encodeURIComponent(window)}`);
        return json.games ?? [];
      } catch (err) {
        console.error("Failed to fetch live casino games from API:", err);
        return [];
      }
    });
  }

  async getGame(slug: string) {
    return this.cached(`game:${slug}`, async () => {
      const json = await this.fetchJson<LiveCasinoGameResponse>(`/games/${encodeURIComponent(slug)}`);
      return json.game ?? json;
    });
  }

  async getStats() {
    return this.cached("stats", () => this.fetchJson<LiveCasinoStatsResponse>("/stats"));
  }

  async getFairness() {
    return this.cached("fairness", async () => this.fetchJson<LiveCasinoFairnessResponse>("/fairness"));
  }
}

export const liveCasinoDataService = new LiveCasinoDataService();
export type { LiveCasinoGame, LiveCasinoGamesResponse, LiveCasinoGameResponse, LiveCasinoStatsResponse, LiveCasinoFairnessResponse };

