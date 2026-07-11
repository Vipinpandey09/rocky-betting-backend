import { db } from "../../lib/db.js";
import { AppError } from "../../lib/errors.js";
import { emitEvent } from "../../websocket/socket.js";
import { SocketEvents } from "../../websocket/events.js";
export class WalletsService {
    async getWallet(userId) {
        const wallet = await db.selectFrom("wallets").selectAll().where("user_id", "=", userId).executeTakeFirst();
        if (!wallet)
            throw new AppError("Wallet not found", 404, "WALLET_NOT_FOUND");
        return wallet;
    }
    history(userId) {
        return db.selectFrom("transactions")
            .selectAll()
            .where("user_id", "=", userId)
            .orderBy("created_at", "desc")
            .execute();
    }
    deposit(userId, amount) {
        return this.moveMoney(userId, amount, "DEPOSIT", "COMPLETED");
    }
    withdraw(userId, amount) {
        return this.moveMoney(userId, amount, "WITHDRAW", "COMPLETED");
    }
    credit(userId, amount, type = "CREDIT") {
        return this.moveMoney(userId, amount, type, "COMPLETED");
    }
    debit(userId, amount) {
        return this.moveMoney(userId, amount, "DEBIT", "COMPLETED");
    }
    async moveMoney(userId, amount, type, status) {
        if (amount <= 0)
            throw new AppError("Amount must be greater than zero", 400, "INVALID_AMOUNT");
        const result = await db.transaction().execute(async (trx) => {
            const wallet = await trx.selectFrom("wallets").selectAll().where("user_id", "=", userId).forUpdate().executeTakeFirst();
            if (!wallet)
                throw new AppError("Wallet not found", 404, "WALLET_NOT_FOUND");
            const current = Number(wallet.balance);
            const next = ["WITHDRAW", "DEBIT"].includes(type) ? current - amount : current + amount;
            if (next < 0)
                throw new AppError("Insufficient wallet balance", 400, "INSUFFICIENT_FUNDS");
            const updated = await trx.updateTable("wallets")
                .set({ balance: next, updated_at: new Date() })
                .where("id", "=", wallet.id)
                .returningAll()
                .executeTakeFirstOrThrow();
            const transaction = await trx.insertInto("transactions").values({
                wallet_id: wallet.id,
                user_id: userId,
                type,
                amount,
                status,
                reference: null,
                metadata: {}
            }).returningAll().executeTakeFirstOrThrow();
            if (type === "DEPOSIT") {
                await trx.insertInto("deposits").values({ user_id: userId, amount, status: "COMPLETED" }).execute();
            }
            if (type === "WITHDRAW") {
                await trx.insertInto("withdrawals").values({ user_id: userId, amount, status: "PAID" }).execute();
            }
            return { wallet: updated, transaction };
        });
        emitEvent(SocketEvents.WALLET_UPDATED, result.wallet, `user:${userId}`);
        return result;
    }
}
export const walletsService = new WalletsService();
