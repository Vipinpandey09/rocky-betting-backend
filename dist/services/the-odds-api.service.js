import { db } from "../lib/db.js";
import { env } from "../config/env.js";
import crypto from "node:crypto";
function toUUID(str) {
    const hash = crypto.createHash("sha256").update(str).digest("hex");
    return [
        hash.substring(0, 8),
        hash.substring(8, 12),
        `4${hash.substring(13, 16)}`,
        `8${hash.substring(17, 20)}`,
        hash.substring(20, 32)
    ].join("-");
}
const SPORT_MAPPINGS = {
    cricket: {
        oddsApiSport: "cricket_ipl",
        sportName: "Cricket"
    },
    football: {
        oddsApiSport: "soccer_epl",
        sportName: "Football"
    },
    volleyball: {
        oddsApiSport: "volleyball_italy_superlega",
        sportName: "Volleyball"
    }
};
export class TheOddsApiService {
    ttl = 5 * 60_000; // 5 minutes cache
    cache = new Map();
    getKey() {
        return env.THE_ODDS_API_KEY.trim();
    }
    async fetchEvents(sportKey) {
        const apiKey = this.getKey();
        if (!apiKey) {
            console.warn("THE_ODDS_API_KEY is not configured in backend/.env");
            return [];
        }
        const cacheKey = sportKey;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.fetchedAt < this.ttl) {
            return cached.data;
        }
        try {
            const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=us,eu,uk,au&markets=h2h&oddsFormat=decimal`;
            const res = await fetch(url);
            if (!res.ok) {
                console.error(`The Odds API HTTP error: ${res.status} for ${sportKey}`);
                return [];
            }
            const data = (await res.json());
            this.cache.set(cacheKey, { data, fetchedAt: Date.now() });
            return data;
        }
        catch (err) {
            console.error(`Failed to fetch from The Odds API for ${sportKey}:`, err);
            return [];
        }
    }
    async syncMatchesToDatabase(sportSlug) {
        const mapping = SPORT_MAPPINGS[sportSlug];
        if (!mapping)
            return;
        const events = await this.fetchEvents(mapping.oddsApiSport);
        if (events.length === 0)
            return;
        let sportRow = await db.selectFrom("sports").selectAll().where("slug", "=", sportSlug).executeTakeFirst();
        if (!sportRow) {
            sportRow = await db.insertInto("sports")
                .values({ name: mapping.sportName, slug: sportSlug, active: true })
                .returningAll()
                .executeTakeFirstOrThrow();
        }
        const now = Date.now();
        for (const event of events) {
            const commenceTime = new Date(event.commence_time).getTime();
            let status = "SCHEDULED";
            if (now >= commenceTime + 4 * 60 * 60 * 1000) {
                status = "FINISHED";
            }
            else if (now >= commenceTime) {
                status = "LIVE";
            }
            // 1. League
            let leagueRow = await db.selectFrom("leagues")
                .selectAll()
                .where("sport_id", "=", sportRow.id)
                .where("name", "=", event.sport_title)
                .executeTakeFirst();
            if (!leagueRow) {
                leagueRow = await db.insertInto("leagues")
                    .values({
                    sport_id: sportRow.id,
                    name: event.sport_title,
                    country: "International",
                    active: true
                })
                    .returningAll()
                    .executeTakeFirstOrThrow();
            }
            // 2. Teams
            let homeTeam = await db.selectFrom("teams")
                .selectAll()
                .where("sport_id", "=", sportRow.id)
                .where("name", "=", event.home_team)
                .executeTakeFirst();
            if (!homeTeam) {
                homeTeam = await db.insertInto("teams")
                    .values({ sport_id: sportRow.id, name: event.home_team, country: event.home_team })
                    .returningAll()
                    .executeTakeFirstOrThrow();
            }
            let awayTeam = await db.selectFrom("teams")
                .selectAll()
                .where("sport_id", "=", sportRow.id)
                .where("name", "=", event.away_team)
                .executeTakeFirst();
            if (!awayTeam) {
                awayTeam = await db.insertInto("teams")
                    .values({ sport_id: sportRow.id, name: event.away_team, country: event.away_team })
                    .returningAll()
                    .executeTakeFirstOrThrow();
            }
            // 3. Match
            const matchId = toUUID(event.id);
            const existingMatch = await db.selectFrom("matches").selectAll().where("id", "=", matchId).executeTakeFirst();
            let last_ball_started_at = null;
            let ball_number = 0;
            if (status === "LIVE") {
                last_ball_started_at = existingMatch?.last_ball_started_at ?? new Date();
                ball_number = existingMatch?.ball_number && existingMatch.ball_number > 0 ? existingMatch.ball_number : 1;
            }
            if (existingMatch) {
                await db.updateTable("matches")
                    .set({
                    league_id: leagueRow.id,
                    home_team_id: homeTeam.id,
                    away_team_id: awayTeam.id,
                    starts_at: new Date(commenceTime),
                    status,
                    last_ball_started_at,
                    ball_number,
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
                    starts_at: new Date(commenceTime),
                    status,
                    home_score: 0,
                    away_score: 0,
                    last_ball_started_at,
                    ball_number
                })
                    .execute();
            }
            // 4. Market
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
            // 5. Odds
            // Get outcomes from first available bookmaker
            let back1 = 1.90;
            let back2 = 1.90;
            if (event.bookmakers && event.bookmakers.length > 0) {
                const bookmaker = event.bookmakers[0];
                const h2hMarket = bookmaker.markets.find(m => m.key === "h2h");
                if (h2hMarket && h2hMarket.outcomes.length >= 2) {
                    const outcome1 = h2hMarket.outcomes.find(o => o.name === event.home_team);
                    const outcome2 = h2hMarket.outcomes.find(o => o.name === event.away_team);
                    if (outcome1)
                        back1 = outcome1.price;
                    if (outcome2)
                        back2 = outcome2.price;
                }
            }
            const lay1 = Number((back1 + 0.05).toFixed(2));
            const lay2 = Number((back2 + 0.05).toFixed(2));
            const existingOdds = await db.selectFrom("odds").selectAll().where("market_id", "=", market.id).execute();
            const homeBackOdd = existingOdds.find(o => o.selection_name === event.home_team);
            const homeLayOdd = existingOdds.find(o => o.selection_name === `${event.home_team} Lay`);
            const awayBackOdd = existingOdds.find(o => o.selection_name === event.away_team);
            const awayLayOdd = existingOdds.find(o => o.selection_name === `${event.away_team} Lay`);
            const oddStatus = status === "FINISHED" ? "SUSPENDED" : "ACTIVE";
            // Home Back
            if (!homeBackOdd) {
                await db.insertInto("odds")
                    .values({ market_id: market.id, selection_name: event.home_team, price: back1, status: oddStatus })
                    .execute();
            }
            else {
                await db.updateTable("odds")
                    .set({ price: back1, status: oddStatus })
                    .where("id", "=", homeBackOdd.id)
                    .execute();
            }
            // Home Lay
            if (!homeLayOdd) {
                await db.insertInto("odds")
                    .values({ market_id: market.id, selection_name: `${event.home_team} Lay`, price: lay1, status: oddStatus })
                    .execute();
            }
            else {
                await db.updateTable("odds")
                    .set({ price: lay1, status: oddStatus })
                    .where("id", "=", homeLayOdd.id)
                    .execute();
            }
            // Away Back
            if (!awayBackOdd) {
                await db.insertInto("odds")
                    .values({ market_id: market.id, selection_name: event.away_team, price: back2, status: oddStatus })
                    .execute();
            }
            else {
                await db.updateTable("odds")
                    .set({ price: back2, status: oddStatus })
                    .where("id", "=", awayBackOdd.id)
                    .execute();
            }
            // Away Lay
            if (!awayLayOdd) {
                await db.insertInto("odds")
                    .values({ market_id: market.id, selection_name: `${event.away_team} Lay`, price: lay2, status: oddStatus })
                    .execute();
            }
            else {
                await db.updateTable("odds")
                    .set({ price: lay2, status: oddStatus })
                    .where("id", "=", awayLayOdd.id)
                    .execute();
            }
        }
    }
}
export const theOddsApiService = new TheOddsApiService();
