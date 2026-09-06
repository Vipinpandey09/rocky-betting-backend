import { validateParams, validateQuery } from "../../lib/validation.js";
import { liveCasinoGameParamsSchema, liveCasinoGamesQuerySchema } from "./live-casino.schemas.js";
import { getFairnessController, getGameController, getGamesController, getStatsController, placeCasinoBetController } from "./live-casino.controller.js";
import { authenticate } from "../auth/auth.middleware.js";
const basePath = "/api/live-casino";
export async function getGames(app) {
    app.get(`${basePath}/games`, { preHandler: [validateQuery(liveCasinoGamesQuerySchema)] }, getGamesController);
}
export async function getGame(app) {
    app.get(`${basePath}/games/:slug`, { preHandler: [validateParams(liveCasinoGameParamsSchema)] }, getGameController);
}
export async function getStats(app) {
    app.get(`${basePath}/stats`, getStatsController);
}
export async function getFairness(app) {
    app.get(`${basePath}/fairness`, getFairnessController);
}
export async function placeCasinoBet(app) {
    app.post(`${basePath}/bet`, { preHandler: [authenticate] }, placeCasinoBetController);
}
