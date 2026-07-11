import type { FastifyInstance } from "fastify";
import { listMarkets } from "./markets.routes.js";

export async function marketsRoutes(app: FastifyInstance) {
  await listMarkets(app);
}
