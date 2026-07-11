import type { FastifyRequest } from "fastify";
import { db } from "../../lib/db.js";
import { apiSportsService } from "../../services/api-sports.service.js";

export async function listSportsController() {
  return db.selectFrom("sports").selectAll().where("active", "=", true).execute();
}

export async function getLeaguesBySportController(request: FastifyRequest) {
  const { sport } = request.params as { sport: "football" | "volleyball" };
  return apiSportsService.getLeagues(sport);
}
