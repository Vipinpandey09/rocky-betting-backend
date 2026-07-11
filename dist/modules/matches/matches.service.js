import { db } from "../../lib/db.js";
import { SocketEvents } from "../../websocket/events.js";
import { emitEvent } from "../../websocket/socket.js";
export class MatchesService {
    async list(status) {
        let query = db.selectFrom("matches")
            .innerJoin("teams as home", "home.id", "matches.home_team_id")
            .innerJoin("teams as away", "away.id", "matches.away_team_id")
            .innerJoin("leagues", "leagues.id", "matches.league_id")
            .innerJoin("sports", "sports.id", "matches.sport_id")
            .select([
            "matches.id",
            "matches.starts_at",
            "matches.status",
            "matches.home_score",
            "matches.away_score",
            "home.name as home_team",
            "away.name as away_team",
            "leagues.name as league",
            "sports.slug as sport_slug"
        ])
            .orderBy("matches.starts_at", "asc");
        if (status)
            query = query.where("matches.status", "=", status);
        const matches = await query.execute();
        if (matches.length === 0)
            return [];
        const matchIds = matches.map((m) => m.id);
        const odds = await db.selectFrom("markets")
            .innerJoin("odds", "odds.market_id", "markets.id")
            .select([
            "markets.match_id",
            "odds.id as odd_id",
            "odds.selection_name",
            "odds.price"
        ])
            .where("markets.match_id", "in", matchIds)
            .where("odds.status", "=", "ACTIVE")
            .execute();
        return matches.map((match) => {
            const matchOdds = odds.filter((o) => o.match_id === match.id);
            return {
                ...match,
                odds: matchOdds.map((o) => ({
                    odd_id: o.odd_id,
                    selection_name: o.selection_name,
                    price: o.price
                }))
            };
        });
    }
    async detail(id) {
        const match = await db.selectFrom("matches")
            .innerJoin("teams as home", "home.id", "matches.home_team_id")
            .innerJoin("teams as away", "away.id", "matches.away_team_id")
            .select(["matches.id", "matches.status", "matches.starts_at", "home.name as home_team", "away.name as away_team"])
            .where("matches.id", "=", id)
            .executeTakeFirst();
        const markets = await db.selectFrom("markets")
            .leftJoin("odds", "odds.market_id", "markets.id")
            .select(["markets.id as market_id", "markets.name", "markets.type", "markets.status", "odds.id as odd_id", "odds.selection_name", "odds.price"])
            .where("markets.match_id", "=", id)
            .execute();
        return { ...match, markets };
    }
    async start(id) {
        const match = await db.updateTable("matches").set({ status: "LIVE", updated_at: new Date() }).where("id", "=", id).returningAll().executeTakeFirstOrThrow();
        emitEvent(SocketEvents.MATCH_STARTED, match, `match:${id}`);
        return match;
    }
}
export const matchesService = new MatchesService();
