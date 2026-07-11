import type { FastifyRequest } from "fastify";
import { cricketService } from "../../services/cricket.service.js";
import { apiSportsService } from "../../services/api-sports.service.js";
import { matchesService } from "./matches.service.js";

export async function listMatchesController(request: FastifyRequest) {
  const { status } = request.query as { status?: "SCHEDULED" | "LIVE" | "FINISHED" };
  try {
    await cricketService.syncMatchesToDatabase();
  } catch (error) {
    request.log.error(error, "Failed to sync cricket matches");
  }
  try {
    await Promise.all([
      apiSportsService.syncSportMatchesToDatabase("football"),
      apiSportsService.syncSportMatchesToDatabase("volleyball")
    ]);
  } catch (error) {
    request.log.error(error, "Failed to sync API-Sports matches");
  }
  return matchesService.list(status);
}

export async function getMatchDetailController(request: FastifyRequest) {
  const { id } = request.params as { id: string };
  return matchesService.detail(id);
}

export async function getLiveCricketController() {
  return cricketService.getLiveMatchSummaries();
}
