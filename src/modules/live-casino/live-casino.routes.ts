import type { FastifyInstance } from "fastify";
import { validateParams, validateQuery } from "../../lib/validation.js";
import { liveCasinoGameParamsSchema, liveCasinoGamesQuerySchema } from "./live-casino.schemas.js";
import { getFairnessController, getGameController, getGamesController, getStatsController } from "./live-casino.controller.js";

const basePath = "/api/live-casino";

export async function getGames(app: FastifyInstance) {
  app.get(`${basePath}/games`, { preHandler: [validateQuery(liveCasinoGamesQuerySchema)] }, getGamesController);
}

export async function getGame(app: FastifyInstance) {
  app.get(`${basePath}/games/:slug`, { preHandler: [validateParams(liveCasinoGameParamsSchema)] }, getGameController);
}

export async function getStats(app: FastifyInstance) {
  app.get(`${basePath}/stats`, getStatsController);
}

export async function getFairness(app: FastifyInstance) {
  app.get(`${basePath}/fairness`, getFairnessController);
}
