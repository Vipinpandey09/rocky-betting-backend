import type { FastifyInstance } from "fastify";
import { listBets, placeBet } from "./bets.routes.js";

export async function betsRoutes(app: FastifyInstance) {
  await listBets(app);
  await placeBet(app);
}

export { betsService } from "./bets.service.js";
