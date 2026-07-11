import { db } from "../../lib/db.js";
import { SocketEvents } from "../../websocket/events.js";
import { emitEvent } from "../../websocket/socket.js";
export class OddsService {
    async update(oddId, price) {
        const odd = await db.updateTable("odds")
            .set({ price, updated_at: new Date() })
            .where("id", "=", oddId)
            .returningAll()
            .executeTakeFirstOrThrow();
        emitEvent(SocketEvents.ODDS_UPDATED, odd);
        return odd;
    }
}
export const oddsService = new OddsService();
