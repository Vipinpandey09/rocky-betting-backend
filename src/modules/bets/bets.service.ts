import { db } from "../../lib/db.js";
import { AppError } from "../../lib/errors.js";
import { SocketEvents } from "../../websocket/events.js";
import { emitEvent } from "../../websocket/socket.js";
import { walletsService } from "../wallets/wallets.service.js";

export class BetsService {
  async list(userId: string) {
    const bets = await db.selectFrom("bets").selectAll().where("user_id", "=", userId).orderBy("created_at", "desc").execute();
    const selections = await db.selectFrom("bet_selections").selectAll().where("bet_id", "in", bets.map((bet) => bet.id)).execute();
    return bets.map((bet) => ({ ...bet, selections: selections.filter((selection) => selection.bet_id === bet.id) }));
  }

  async place(userId: string, input: { stake: number; selections: Array<{ oddId: string }> }) {
    const odds = await db.selectFrom("odds")
      .innerJoin("markets", "markets.id", "odds.market_id")
      .innerJoin("matches", "matches.id", "markets.match_id")
      .select([
        "odds.id as odd_id",
        "odds.market_id",
        "odds.selection_name",
        "odds.price",
        "odds.status as odd_status",
        "markets.status as market_status",
        "matches.id as match_id",
        "matches.status as match_status",
        "matches.starts_at as match_starts_at"
      ])
      .where("odds.id", "in", input.selections.map((selection) => selection.oddId))
      .execute();

    if (odds.length !== input.selections.length) throw new AppError("One or more odds were not found", 404, "ODDS_NOT_FOUND");
    const now = Date.now();
    if (odds.some((odd) => {
      const isLiveOrScheduled = ["SCHEDULED", "LIVE"].includes(odd.match_status);
      const isTimeValid = odd.match_status === "LIVE" || new Date(odd.match_starts_at).getTime() > now;
      return odd.odd_status !== "ACTIVE" || odd.market_status !== "OPEN" || !isLiveOrScheduled || !isTimeValid;
    })) {
      throw new AppError("One or more selections are unavailable", 400, "SELECTION_UNAVAILABLE");
    }

    const totalOdds = odds.reduce((acc, odd) => acc * Number(odd.price), 1);
    const potentialPayout = Number((input.stake * totalOdds).toFixed(2));

    await walletsService.debit(userId, input.stake);

    const bet = await db.transaction().execute(async (trx) => {
      const created = await trx.insertInto("bets").values({
        user_id: userId,
        stake: input.stake,
        total_odds: totalOdds,
        potential_payout: potentialPayout,
        status: "PENDING"
      }).returningAll().executeTakeFirstOrThrow();

      await trx.insertInto("bet_selections").values(odds.map((odd) => ({
        bet_id: created.id,
        odd_id: odd.odd_id,
        market_id: odd.market_id,
        match_id: odd.match_id,
        selection_name: odd.selection_name,
        price: odd.price,
        result: "PENDING" as const
      }))).execute();

      return created;
    });

    emitEvent(SocketEvents.BET_PLACED, bet, `user:${userId}`);
    return { bet, totalOdds, potentialPayout };
  }
}

export const betsService = new BetsService();
