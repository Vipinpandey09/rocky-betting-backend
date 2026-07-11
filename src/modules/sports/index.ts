import type { FastifyInstance } from "fastify";
import { listSports, getLeaguesBySport } from "./sports.routes.js";

export async function sportsRoutes(app: FastifyInstance) {
  await listSports(app);
  await getLeaguesBySport(app);
}
