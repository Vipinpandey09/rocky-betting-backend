import type { FastifyInstance } from "fastify";
import { authenticate } from "../auth/auth.middleware.js";
import { validateBody } from "../../lib/validation.js";
import { amountBodySchema } from "./wallets.schemas.js";
import { depositController, getTransactionsController, getWalletController, withdrawController } from "./wallets.controller.js";

const basePath = "/api/wallet";

export async function getWallet(app: FastifyInstance) {
  app.get(basePath, { preHandler: [authenticate] }, getWalletController);
}

export async function getTransactions(app: FastifyInstance) {
  app.get(`${basePath}/transactions`, { preHandler: [authenticate] }, getTransactionsController);
}

export async function deposit(app: FastifyInstance) {
  app.post(`${basePath}/deposit`, { preHandler: [authenticate, validateBody(amountBodySchema)] }, depositController);
}

export async function withdraw(app: FastifyInstance) {
  app.post(`${basePath}/withdraw`, { preHandler: [authenticate, validateBody(amountBodySchema)] }, withdrawController);
}
