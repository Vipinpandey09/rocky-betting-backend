import type { FastifyInstance } from "fastify";
import { listLeaguesController } from "./leagues.controller.js";

const basePath = "/api/leagues";

export async function listLeagues(app: FastifyInstance) {
  app.get(basePath, listLeaguesController);
}
