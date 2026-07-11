import type { FastifyInstance } from "fastify";
import { listOdds } from "./odds.routes.js";

export async function oddsRoutes(app: FastifyInstance) {
  await listOdds(app);
}

export { oddsService } from "./odds.service.js";
