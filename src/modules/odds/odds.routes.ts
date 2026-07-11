import type { FastifyInstance } from "fastify";
import { listOddsController } from "./odds.controller.js";

const basePath = "/api/odds";

export async function listOdds(app: FastifyInstance) {
  app.get(basePath, listOddsController);
}
