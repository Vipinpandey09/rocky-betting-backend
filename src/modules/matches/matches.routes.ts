import type { FastifyInstance } from "fastify";
import { validateQuery, validateParams } from "../../lib/validation.js";
import { matchQuerySchema, matchParamsSchema } from "./matches.schemas.js";
import { getLiveCricketController, getMatchDetailController, listMatchesController } from "./matches.controller.js";

const basePath = "/api/matches";

export async function registerRoutes(app: FastifyInstance) {
  app.get(basePath, { preHandler: [validateQuery(matchQuerySchema)] }, listMatchesController);
}

export async function getMatchDetail(app: FastifyInstance) {
  app.get(`${basePath}/:id`, { preHandler: [validateParams(matchParamsSchema)] }, getMatchDetailController);
}

export async function getLiveCricket(app: FastifyInstance) {
  app.get("/api/cricket/live", getLiveCricketController);
}