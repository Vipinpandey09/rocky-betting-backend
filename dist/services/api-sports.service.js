import crypto from "node:crypto";
import { env } from "../config/env.js";
import { db } from "../lib/db.js";
const SPORT_CONFIG = {
    football: {
        sportSlug: "football",
        sportName: "Football",
        baseUrl: "https://v3.football.api-sports.io",
        collection: "fixtures"
    },
    volleyball: {
        sportSlug: "volleyball",
        sportName: "Volleyball",
        baseUrl: "https://v1.volleyball.api-sports.io",
        collection: "games"
    }
};
function toUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(str))
        return str.toLowerCase();
    const hash = crypto.createHash("sha1").update(str).digest("hex");
    return [
        hash.slice(0, 8),
        hash.slice(8, 12),
        `4${hash.slice(13, 16)}`,
        `${((parseInt(hash.slice(16, 17), 16) & 0x3) | 0x8).toString(16)}${hash.slice(17, 20)}`,
        hash.slice(20, 32)
    ].join("-");
}
function normalizeStatus(shortStatus) {
    const status = (shortStatus ?? "").toUpperCase();
    if (["LIVE", "1H", "2H", "HT", "ET", "BT"].includes(status))
        return "LIVE";
    if (["FT", "AET", "PEN", "FINISHED"].includes(status))
        return "FINISHED";
    if (["CANC", "POSTP", "ABD", "SUSP", "AWD"].includes(status))
        return "CANCELLED";
    return "SCHEDULED";
}
function extractTeamName(match, side) {
    if (side === "home") {
        return match.teams?.home?.name ?? match.home?.name ?? null;
    }
    return match.teams?.away?.name ?? match.teams?.visitors?.name ?? match.away?.name ?? null;
}
function extractMatchId(match) {
    const rawId = match.fixture?.id ?? match.game?.id ?? match.id;
    return rawId ? String(rawId) : null;
}
function extractStartsAt(match) {
    const rawDate = match.fixture?.date ?? match.game?.date;
    return rawDate ? new Date(rawDate) : new Date();
}
function extractLeague(match) {
    return {
        name: match.league?.name ?? "API-Sports League",
        country: match.league?.country ?? "International"
    };
}
function extractScores(match) {
    const homeScore = match.goals?.home ?? match.scores?.home ?? 0;
    const awayScore = match.goals?.away ?? match.scores?.away ?? 0;
    return { homeScore, awayScore };
}
class ApiSportsService {
    ttl = 5 * 60_000;
    syncInterval = 5 * 60_000;
    cache = new Map();
    lastSynced = new Map();
    getKey() {
        return env.APISPORTS_KEY.trim();
    }
    async fetchCollection(sport, path) {
        const apiKey = this.getKey();
        if (!apiKey) {
            throw new Error("APISPORTS_KEY is not configured in backend/.env");
        }
        const config = SPORT_CONFIG[sport];
        const url = new URL(`${config.baseUrl}/${path}`);
        url.searchParams.set("timezone", "Asia/Kolkata");
        url.searchParams.set("page", "1");
        const res = await fetch(url, {
            headers: {
                "x-apisports-key": apiKey
            }
        });
        if (!res.ok) {
            throw new Error(`API-Sports HTTP ${res.status} for ${sport} ${path}`);
        }
        const json = (await res.json());
        return json.response ?? [];
    }
    async getLeagues(sport) {
        const cacheKey = `${sport}:leagues`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.fetchedAt < this.ttl) {
            return cached.data;
        }
        const leagues = await this.fetchCollection(sport, "leagues");
        this.cache.set(cacheKey, { data: leagues, fetchedAt: Date.now() });
        return leagues;
    }
    async getMatches(sport, mode) {
        const config = SPORT_CONFIG[sport];
        const cacheKey = `${sport}:${mode}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.fetchedAt < this.ttl) {
            return cached.data;
        }
        const endpoint = mode === "live"
            ? `${config.collection}?live=all`
            : `${config.collection}?next=25`;
        const matches = await this.fetchCollection(sport, endpoint);
        this.cache.set(cacheKey, { data: matches, fetchedAt: Date.now() });
        return matches;
    }
    async syncSportMatchesToDatabase(sport) {
        const hasKey = Boolean(this.getKey() && this.getKey().length > 0);
        if (hasKey) {
            if (Date.now() - (this.lastSynced.get(sport) ?? 0) < this.syncInterval) {
                return;
            }
        }
        let mergedMatches = [];
        if (hasKey) {
            try {
                const matches = await Promise.all([
                    this.getMatches(sport, "live"),
                    this.getMatches(sport, "upcoming")
                ]);
                mergedMatches = matches.flat();
            }
            catch (err) {
                console.error(`Failed to fetch API-Sports matches for ${sport}:`, err);
                mergedMatches = [];
            }
        }
        else {
            mergedMatches = [];
        }
        if (mergedMatches.length === 0) {
            this.lastSynced.set(sport, Date.now());
            return;
        }
        let sportRow = await db.selectFrom("sports").selectAll().where("slug", "=", sport).executeTakeFirst();
        if (!sportRow) {
            sportRow = await db.insertInto("sports")
                .values({ name: SPORT_CONFIG[sport].sportName, slug: sport, active: true })
                .returningAll()
                .executeTakeFirstOrThrow();
        }
        const seen = new Set();
        const uniqueMatches = mergedMatches.filter((match) => {
            const matchId = extractMatchId(match);
            if (!matchId || seen.has(matchId))
                return false;
            seen.add(matchId);
            return true;
        });
        for (const match of uniqueMatches) {
            const externalId = extractMatchId(match);
            const homeName = extractTeamName(match, "home");
            const awayName = extractTeamName(match, "away");
            if (!externalId || !homeName || !awayName)
                continue;
            const league = extractLeague(match);
            const startsAt = extractStartsAt(match);
            const status = normalizeStatus(match.fixture?.status?.short ?? match.game?.status?.short ?? match.status?.short);
            const { homeScore, awayScore } = extractScores(match);
            let leagueRow = await db.selectFrom("leagues")
                .selectAll()
                .where("sport_id", "=", sportRow.id)
                .where("name", "=", league.name)
                .executeTakeFirst();
            if (!leagueRow) {
                leagueRow = await db.insertInto("leagues")
                    .values({
                    sport_id: sportRow.id,
                    name: league.name,
                    country: league.country,
                    active: true
                })
                    .returningAll()
                    .executeTakeFirstOrThrow();
            }
            let homeTeam = await db.selectFrom("teams").selectAll()
                .where("sport_id", "=", sportRow.id)
                .where("name", "=", homeName)
                .executeTakeFirst();
            if (!homeTeam) {
                homeTeam = await db.insertInto("teams")
                    .values({ sport_id: sportRow.id, name: homeName, country: homeName })
                    .returningAll()
                    .executeTakeFirstOrThrow();
            }
            let awayTeam = await db.selectFrom("teams").selectAll()
                .where("sport_id", "=", sportRow.id)
                .where("name", "=", awayName)
                .executeTakeFirst();
            if (!awayTeam) {
                awayTeam = await db.insertInto("teams")
                    .values({ sport_id: sportRow.id, name: awayName, country: awayName })
                    .returningAll()
                    .executeTakeFirstOrThrow();
            }
            const matchId = toUUID(`${sport}:${externalId}`);
            const existingMatch = await db.selectFrom("matches").selectAll().where("id", "=", matchId).executeTakeFirst();
            if (existingMatch) {
                await db.updateTable("matches")
                    .set({
                    league_id: leagueRow.id,
                    home_team_id: homeTeam.id,
                    away_team_id: awayTeam.id,
                    starts_at: startsAt,
                    status,
                    home_score: homeScore,
                    away_score: awayScore,
                    updated_at: new Date()
                })
                    .where("id", "=", matchId)
                    .execute();
            }
            else {
                await db.insertInto("matches")
                    .values({
                    id: matchId,
                    sport_id: sportRow.id,
                    league_id: leagueRow.id,
                    home_team_id: homeTeam.id,
                    away_team_id: awayTeam.id,
                    starts_at: startsAt,
                    status,
                    home_score: homeScore,
                    away_score: awayScore
                })
                    .execute();
            }
            let market = await db.selectFrom("markets")
                .selectAll()
                .where("match_id", "=", matchId)
                .where("type", "=", "MATCH_WINNER")
                .executeTakeFirst();
            const marketStatus = status === "FINISHED" ? "SETTLED" : status === "LIVE" ? "SUSPENDED" : "OPEN";
            if (!market) {
                market = await db.insertInto("markets")
                    .values({
                    match_id: matchId,
                    name: "Match Winner",
                    type: "MATCH_WINNER",
                    status: marketStatus
                })
                    .returningAll()
                    .executeTakeFirstOrThrow();
            }
            else {
                await db.updateTable("markets")
                    .set({ status: marketStatus })
                    .where("id", "=", market.id)
                    .execute();
            }
            const existingOdds = await db.selectFrom("odds").selectAll().where("market_id", "=", market.id).execute();
            const homeOdd = existingOdds.find((odd) => odd.selection_name === homeName);
            const awayOdd = existingOdds.find((odd) => odd.selection_name === awayName);
            const generated = this.generateOdds(matchId);
            const oddStatus = status === "FINISHED" ? "SUSPENDED" : "ACTIVE";
            if (!homeOdd) {
                await db.insertInto("odds")
                    .values({
                    market_id: market.id,
                    selection_name: homeName,
                    price: generated.back1,
                    status: oddStatus
                })
                    .execute();
            }
            else {
                await db.updateTable("odds")
                    .set({ price: generated.back1, status: oddStatus, updated_at: new Date() })
                    .where("id", "=", homeOdd.id)
                    .execute();
            }
            if (!awayOdd) {
                await db.insertInto("odds")
                    .values({
                    market_id: market.id,
                    selection_name: awayName,
                    price: generated.back2,
                    status: oddStatus
                })
                    .execute();
            }
            else {
                await db.updateTable("odds")
                    .set({ price: generated.back2, status: oddStatus, updated_at: new Date() })
                    .where("id", "=", awayOdd.id)
                    .execute();
            }
        }
        this.lastSynced.set(sport, Date.now());
    }
    generateOdds(matchId) {
        const seed = parseInt(matchId.replace(/-/g, "").slice(0, 8), 16) % 100;
        const base1 = 1.5 + (seed % 20) / 20;
        const base2 = 1.5 + ((seed + 13) % 20) / 20;
        return {
            back1: parseFloat(base1.toFixed(2)),
            lay1: parseFloat((base1 + 0.02).toFixed(2)),
            back2: parseFloat(base2.toFixed(2)),
            lay2: parseFloat((base2 + 0.02).toFixed(2))
        };
    }
}
export const apiSportsService = new ApiSportsService();
