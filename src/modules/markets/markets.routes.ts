import type { FastifyInstance } from "fastify";
import { listMarketsController } from "./markets.controller.js";

const basePath = "/api/markets";

export async function listMarkets(app: FastifyInstance) {
  app.get(basePath, listMarketsController);
}
