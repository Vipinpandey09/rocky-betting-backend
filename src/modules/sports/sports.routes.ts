import type { FastifyInstance } from "fastify";
import { validateParams } from "../../lib/validation.js";
import { sportParamsSchema } from "./sports.schemas.js";
import { getLeaguesBySportController, listSportsController } from "./sports.controller.js";

const basePath = "/api/sports";

export async function listSports(app: FastifyInstance) {
  app.get(basePath, listSportsController);
}

export async function getLeaguesBySport(app: FastifyInstance) {
  app.get("/api/apisports/:sport/leagues", { preHandler: [validateParams(sportParamsSchema)] }, getLeaguesBySportController);
}
