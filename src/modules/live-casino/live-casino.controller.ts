import type { FastifyRequest } from "fastify";
import { liveCasinoDataService } from "./live-casino.service.js";

export async function getGamesController(request: FastifyRequest) {
  const { window } = request.query as { window: string };
  return liveCasinoDataService.getGames(window);
}

export async function getGameController(request: FastifyRequest) {
  const { slug } = request.params as { slug: string };
  return liveCasinoDataService.getGame(slug);
}

export async function getStatsController() {
  return liveCasinoDataService.getStats();
}

export async function getFairnessController() {
  return liveCasinoDataService.getFairness();
}
