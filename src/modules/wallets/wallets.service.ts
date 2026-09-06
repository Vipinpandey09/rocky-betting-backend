import { db } from "../../lib/db.js";
import { AppError } from "../../lib/errors.js";
import { emitEvent } from "../../websocket/socket.js";
import { SocketEvents } from "../../websocket/events.js";

export class WalletsService {
  async getWallet(userId: string) {
    const wallet = await db.selectFrom("wallets").selectAll().where("user_id", "=", userId).executeTakeFirst();
    if (!wallet) throw new AppError("Wallet not found", 404, "WALLET_NOT_FOUND");
    return wallet;
  }

  history(userId: string) {
    return db.selectFrom("transactions")
      .selectAll()
      .where("user_id", "=", userId)
      .orderBy("created_at", "desc")
      .execute();
  }

  async deposit(userId: string, amount: number) {
    if (amount <= 0) throw new AppError("Amount must be greater than zero", 400, "INVALID_AMOUNT");
    const deposit = await db.insertInto("deposits").values({
      user_id: userId,
      amount,
      status: "PENDING"
    }).returningAll().executeTakeFirstOrThrow();
    return { deposit };
  }

  async withdraw(userId: string, amount: number) {
    if (amount <= 0) throw new AppError("Amount must be greater than zero", 400, "INVALID_AMOUNT");
    const result = await db.transaction().execute(async (trx) => {
      const wallet = await trx.selectFrom("wallets").selectAll().where("user_id", "=", userId).forUpdate().executeTakeFirst();
      if (!wallet) throw new AppError("Wallet not found", 404, "WALLET_NOT_FOUND");
      if (Number(wallet.balance) < amount) throw new AppError("Insufficient balance", 400, "INSUFFICIENT_FUNDS");

      const next = Number(wallet.balance) - amount;
      const updatedWallet = await trx.updateTable("wallets").set({ balance: next, updated_at: new Date() }).where("id", "=", wallet.id).returningAll().executeTakeFirstOrThrow();

      const txn = await trx.insertInto("transactions").values({
        wallet_id: wallet.id,
        user_id: userId,
        type: "WITHDRAW",
        amount,
        status: "PENDING",
        reference: null,
        metadata: { info: "Withdrawal request submitted" }
      }).returningAll().executeTakeFirstOrThrow();

      const withdrawal = await trx.insertInto("withdrawals").values({
        user_id: userId,
        amount,
        status: "PENDING"
      }).returningAll().executeTakeFirstOrThrow();

      return { wallet: updatedWallet, transaction: txn, withdrawal };
    });

    emitEvent(SocketEvents.WALLET_UPDATED, result.wallet, `user:${userId}`);
    return result;
  }

  async approveDeposit(depositId: string) {
    return db.transaction().execute(async (trx) => {
      const deposit = await trx.selectFrom("deposits").selectAll().where("id", "=", depositId).forUpdate().executeTakeFirst();
      if (!deposit) throw new AppError("Deposit request not found", 404, "DEPOSIT_NOT_FOUND");
      if (deposit.status !== "PENDING") throw new AppError("Deposit is already processed", 400, "ALREADY_PROCESSED");

      await trx.updateTable("deposits").set({ status: "COMPLETED" }).where("id", "=", depositId).execute();

      const wallet = await trx.selectFrom("wallets").selectAll().where("user_id", "=", deposit.user_id).forUpdate().executeTakeFirst();
      if (!wallet) throw new AppError("Wallet not found", 404, "WALLET_NOT_FOUND");

      const next = Number(wallet.balance) + Number(deposit.amount);
      const updatedWallet = await trx.updateTable("wallets").set({ balance: next, updated_at: new Date() }).where("id", "=", wallet.id).returningAll().executeTakeFirstOrThrow();

      await trx.insertInto("transactions").values({
        wallet_id: wallet.id,
        user_id: deposit.user_id,
        type: "DEPOSIT",
        amount: Number(deposit.amount),
        status: "COMPLETED",
        reference: depositId,
        metadata: { info: "Deposit approved by admin" }
      }).execute();

      emitEvent(SocketEvents.WALLET_UPDATED, updatedWallet, `user:${deposit.user_id}`);
      return { success: true };
    });
  }

  async rejectDeposit(depositId: string) {
    const deposit = await db.selectFrom("deposits").selectAll().where("id", "=", depositId).executeTakeFirst();
    if (!deposit) throw new AppError("Deposit request not found", 404, "DEPOSIT_NOT_FOUND");
    if (deposit.status !== "PENDING") throw new AppError("Deposit is already processed", 400, "ALREADY_PROCESSED");

    await db.updateTable("deposits").set({ status: "REJECTED" }).where("id", "=", depositId).execute();
    return { success: true };
  }

  async approveWithdraw(withdrawalId: string) {
    const withdrawal = await db.selectFrom("withdrawals").selectAll().where("id", "=", withdrawalId).executeTakeFirst();
    if (!withdrawal) throw new AppError("Withdrawal request not found", 404, "WITHDRAWAL_NOT_FOUND");
    if (withdrawal.status !== "PENDING") throw new AppError("Withdrawal is already processed", 400, "ALREADY_PROCESSED");

    await db.updateTable("withdrawals").set({ status: "COMPLETED" }).where("id", "=", withdrawalId).execute();
    return { success: true };
  }

  async rejectWithdraw(withdrawalId: string) {
    return db.transaction().execute(async (trx) => {
      const withdrawal = await trx.selectFrom("withdrawals").selectAll().where("id", "=", withdrawalId).forUpdate().executeTakeFirst();
      if (!withdrawal) throw new AppError("Withdrawal request not found", 404, "WITHDRAWAL_NOT_FOUND");
      if (withdrawal.status !== "PENDING") throw new AppError("Withdrawal is already processed", 400, "ALREADY_PROCESSED");

      await trx.updateTable("withdrawals").set({ status: "REJECTED" }).where("id", "=", withdrawalId).execute();

      const wallet = await trx.selectFrom("wallets").selectAll().where("user_id", "=", withdrawal.user_id).forUpdate().executeTakeFirst();
      if (!wallet) throw new AppError("Wallet not found", 404, "WALLET_NOT_FOUND");

      const next = Number(wallet.balance) + Number(withdrawal.amount);
      const updatedWallet = await trx.updateTable("wallets").set({ balance: next, updated_at: new Date() }).where("id", "=", wallet.id).returningAll().executeTakeFirstOrThrow();

      await trx.insertInto("transactions").values({
        wallet_id: wallet.id,
        user_id: withdrawal.user_id,
        type: "REFUND",
        amount: Number(withdrawal.amount),
        status: "COMPLETED",
        reference: withdrawalId,
        metadata: { info: "Withdrawal rejected by admin (refunded)" }
      }).execute();

      emitEvent(SocketEvents.WALLET_UPDATED, updatedWallet, `user:${withdrawal.user_id}`);
      return { success: true };
    });
  }

  credit(userId: string, amount: number, type: "CREDIT" | "PAYOUT" | "REFUND" = "CREDIT") {
    return this.moveMoney(userId, amount, type, "COMPLETED");
  }

  debit(userId: string, amount: number) {
    return this.moveMoney(userId, amount, "DEBIT", "COMPLETED");
  }

  private async moveMoney(
    userId: string,
    amount: number,
    type: "DEPOSIT" | "WITHDRAW" | "CREDIT" | "DEBIT" | "PAYOUT" | "REFUND",
    status: "PENDING" | "COMPLETED" | "FAILED"
  ) {
    if (amount <= 0) throw new AppError("Amount must be greater than zero", 400, "INVALID_AMOUNT");

    const result = await db.transaction().execute(async (trx) => {
      const wallet = await trx.selectFrom("wallets").selectAll().where("user_id", "=", userId).forUpdate().executeTakeFirst();
      if (!wallet) throw new AppError("Wallet not found", 404, "WALLET_NOT_FOUND");

      const current = Number(wallet.balance);
      const next = ["WITHDRAW", "DEBIT"].includes(type) ? current - amount : current + amount;
      if (next < 0) throw new AppError("Insufficient wallet balance", 400, "INSUFFICIENT_FUNDS");

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
