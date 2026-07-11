const BASE = "https://livecasinodata.com/api/v1";
const TTL = 5 * 60_000;
class LiveCasinoDataService {
    cache = new Map();
    async fetchJson(path) {
        const response = await fetch(`${BASE}${path}`);
        if (!response.ok) {
            throw new Error(`LiveCasinoData HTTP ${response.status} for ${path}`);
        }
        return response.json();
    }
    async cached(key, loader) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.fetchedAt < TTL) {
            return cached.data;
        }
        const data = await loader();
        this.cache.set(key, { fetchedAt: Date.now(), data });
        return data;
    }
    async getGames(window = "30d") {
        return this.cached(`games:${window}`, async () => {
            const json = await this.fetchJson(`/games?window=${encodeURIComponent(window)}`);
            return json.games ?? [];
        });
    }
    async getGame(slug) {
        return this.cached(`game:${slug}`, async () => {
            const json = await this.fetchJson(`/games/${encodeURIComponent(slug)}`);
            return json.game ?? json;
        });
    }
    async getStats() {
        return this.cached("stats", () => this.fetchJson("/stats"));
    }
    async getFairness() {
        return this.cached("fairness", async () => this.fetchJson("/fairness"));
    }
}
export const liveCasinoDataService = new LiveCasinoDataService();
