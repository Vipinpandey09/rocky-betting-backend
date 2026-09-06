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
            "sports.slug as sport_slug",
            "matches.last_ball_started_at",
            "matches.ball_number"
        ])
            .orderBy("matches.starts_at", "asc");
        if (status)
            query = query.where("matches.status", "=", status);
        const matches = await query.execute();
        if (matches.length === 0)
            return [];
        for (const m of matches) {
            if (m.status === "LIVE" && !m.last_ball_started_at) {
                const now = new Date();
                await db.updateTable("matches")
                    .set({
                    last_ball_started_at: now,
                    ball_number: 1,
                    updated_at: now
                })
                    .where("id", "=", m.id)
                    .execute();
                m.last_ball_started_at = now;
                m.ball_number = 1;
            }
        }
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
        let match = await db.selectFrom("matches")
            .innerJoin("teams as home", "home.id", "matches.home_team_id")
            .innerJoin("teams as away", "away.id", "matches.away_team_id")
            .select([
            "matches.id",
            "matches.status",
            "matches.starts_at",
            "home.name as home_team",
            "away.name as away_team",
            "matches.last_ball_started_at",
            "matches.ball_number"
        ])
            .where("matches.id", "=", id)
            .executeTakeFirst();
        if (!match)
            return null;
        if (match.status === "LIVE" && !match.last_ball_started_at) {
            const now = new Date();
            await db.updateTable("matches")
                .set({
                last_ball_started_at: now,
                ball_number: 1,
                updated_at: now
            })
                .where("id", "=", id)
                .execute();
            match.last_ball_started_at = now;
            match.ball_number = 1;
        }
        const markets = await db.selectFrom("markets")
            .leftJoin("odds", "odds.market_id", "markets.id")
            .select(["markets.id as market_id", "markets.name", "markets.type", "markets.status", "odds.id as odd_id", "odds.selection_name", "odds.price"])
            .where("markets.match_id", "=", id)
            .execute();
        // Map odds for frontend convenience
        const odds = markets
            .filter((m) => m.odd_id !== null)
            .map((m) => ({
            odd_id: m.odd_id,
            selection_name: m.selection_name,
            price: Number(m.price)
        }));
        return { ...match, markets, odds };
    }
    async start(id) {
        await db.updateTable("matches")
            .set({
            status: "LIVE",
            ball_number: 1,
            last_ball_started_at: new Date(),
            updated_at: new Date()
        })
            .where("id", "=", id)
            .execute();
        const detail = await this.detail(id);
        emitEvent(SocketEvents.MATCH_STARTED, detail, `match:${id}`);
        return detail;
    }
    async nextBall(id) {
        const current = await db.selectFrom("matches")
            .select(["ball_number", "status"])
            .where("id", "=", id)
            .executeTakeFirstOrThrow();
        if (current.status !== "LIVE") {
            throw new Error("Match is not LIVE");
        }
        const nextBallNumber = (current.ball_number || 0) + 1;
        await db.updateTable("matches")
            .set({
            ball_number: nextBallNumber,
            last_ball_started_at: new Date(),
            updated_at: new Date()
        })
            .where("id", "=", id)
            .execute();
        const detail = await this.detail(id);
        emitEvent(SocketEvents.MATCH_UPDATED, detail, `match:${id}`);
        return detail;
    }
}
export const matchesService = new MatchesService();
