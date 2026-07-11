import type { FastifyInstance } from "fastify";
import { getWallet, getTransactions, deposit, withdraw } from "./wallets.routes.js";

export async function walletsRoutes(app: FastifyInstance) {
  await getWallet(app);
  await getTransactions(app);
  await deposit(app);
  await withdraw(app);
}

export { walletsService } from "./wallets.service.js";
