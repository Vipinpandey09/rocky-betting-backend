import { db } from "../../lib/db.js";
import { AppError } from "../../lib/errors.js";
import { SocketEvents } from "../../websocket/events.js";
import { emitEvent } from "../../websocket/socket.js";
import { walletsService } from "../wallets/wallets.service.js";

export class SettlementService {
  async settleBet(betId: string, result: "WON" | "LOST" | "VOID") {
    const bet = await db.selectFrom("bets").selectAll().where("id", "=", betId).executeTakeFirst();
    if (!bet) throw new AppError("Bet not found", 404, "BET_NOT_FOUND");
    if (bet.status !== "PENDING") throw new AppError("Bet already settled", 400, "BET_ALREADY_SETTLED");

    const status = result;
    const settled = await db.updateTable("bets")
      .set({ status, settled_at: new Date() })
      .where("id", "=", betId)
      .returningAll()
      .executeTakeFirstOrThrow();

    await db.updateTable("bet_selections").set({ result }).where("bet_id", "=", betId).execute();

    if (result === "WON") await walletsService.credit(bet.user_id, Number(bet.potential_payout), "PAYOUT");
    if (result === "VOID") await walletsService.credit(bet.user_id, Number(bet.stake), "REFUND");

    emitEvent(SocketEvents.BET_SETTLED, settled, `user:${bet.user_id}`);
    return settled;
  }

  async finishMatch(matchId: string, homeScore: number, awayScore: number) {
    const match = await db.updateTable("matches")
      .set({ status: "FINISHED", home_score: homeScore, away_score: awayScore, updated_at: new Date() })
      .where("id", "=", matchId)
      .returningAll()
      .executeTakeFirst();
    if (!match) throw new AppError("Match not found", 404, "MATCH_NOT_FOUND");
    emitEvent(SocketEvents.MATCH_FINISHED, match, `match:${matchId}`);
    return match;
  }
}

export const settlementService = new SettlementService();
