import type { FastifyInstance } from "fastify";
import { listTeams } from "./teams.routes.js";

export async function teamsRoutes(app: FastifyInstance) {
  await listTeams(app);
}
