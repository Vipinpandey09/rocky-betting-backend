import type { FastifyInstance } from "fastify";
import { getGames, getGame, getStats, getFairness } from "./live-casino.routes.js";

export async function liveCasinoRoutes(app: FastifyInstance) {
  await getGames(app);
  await getGame(app);
  await getStats(app);
  await getFairness(app);
}

export { liveCasinoDataService } from "./live-casino.service.js";
