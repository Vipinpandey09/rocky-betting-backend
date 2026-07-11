import type { FastifyInstance } from "fastify";
import { authenticate } from "../auth/auth.middleware.js";
import { validateBody } from "../../lib/validation.js";
import { placeBetSchema } from "./bets.schemas.js";
import { listBetsController, placeBetController } from "./bets.controller.js";

const basePath = "/api/bets";

export async function listBets(app: FastifyInstance) {
  app.get(basePath, { preHandler: [authenticate] }, listBetsController);
}

export async function placeBet(app: FastifyInstance) {
  app.post(basePath, { preHandler: [authenticate, validateBody(placeBetSchema)] }, placeBetController);
}
