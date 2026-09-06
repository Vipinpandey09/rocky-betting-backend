import { db } from "../../lib/db.js";
import { AppError } from "../../lib/errors.js";
import { SocketEvents } from "../../websocket/events.js";
import { emitEvent } from "../../websocket/socket.js";
import { walletsService } from "../wallets/wallets.service.js";
export class SettlementService {
    async settleBet(betId, result) {
        const bet = await db.selectFrom("bets").selectAll().where("id", "=", betId).executeTakeFirst();
        if (!bet)
            throw new AppError("Bet not found", 404, "BET_NOT_FOUND");
        if (bet.status !== "PENDING")
            throw new AppError("Bet already settled", 400, "BET_ALREADY_SETTLED");
        const status = result;
        const settled = await db.updateTable("bets")
            .set({ status, settled_at: new Date() })
            .where("id", "=", betId)
            .returningAll()
            .executeTakeFirstOrThrow();
        await db.updateTable("bet_selections").set({ result }).where("bet_id", "=", betId).execute();
        if (result === "WON")
            await walletsService.credit(bet.user_id, Number(bet.potential_payout), "PAYOUT");
        if (result === "VOID")
            await walletsService.credit(bet.user_id, Number(bet.stake), "REFUND");
        emitEvent(SocketEvents.BET_SETTLED, settled, `user:${bet.user_id}`);
        return settled;
    }
    async finishMatch(matchId, homeScore, awayScore) {
        const matchDetail = await db.selectFrom("matches")
            .innerJoin("teams as home", "home.id", "matches.home_team_id")
            .innerJoin("teams as away", "away.id", "matches.away_team_id")
            .select(["home.name as home_name", "away.name as away_name"])
            .where("matches.id", "=", matchId)
            .executeTakeFirst();
        const match = await db.updateTable("matches")
            .set({ status: "FINISHED", home_score: homeScore, away_score: awayScore, updated_at: new Date() })
            .where("id", "=", matchId)
            .returningAll()
            .executeTakeFirst();
        if (!match)
            throw new AppError("Match not found", 404, "MATCH_NOT_FOUND");
        const selections = await db.selectFrom("bet_selections")
            .select(["bet_id", "selection_name"])
            .where("match_id", "=", matchId)
            .where("result", "=", "PENDING")
            .execute();
        for (const sel of selections) {
            let outcome = "LOST";
            if (homeScore === awayScore) {
                outcome = "VOID";
            }
            else {
                const winnerName = homeScore > awayScore ? matchDetail?.home_name : matchDetail?.away_name;
                if (winnerName && sel.selection_name === winnerName) {
                    outcome = "WON";
                }
            }
            try {
                await this.settleBet(sel.bet_id, outcome);
            }
            catch (err) {
                console.error(`Failed to auto-settle bet ${sel.bet_id}:`, err);
            }
        }
        emitEvent(SocketEvents.MATCH_FINISHED, match, `match:${matchId}`);
        return match;
    }
}
export const settlementService = new SettlementService();
