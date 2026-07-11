import type { FastifyInstance } from "fastify";
import { listLeagues } from "./leagues.routes.js";

export async function leaguesRoutes(app: FastifyInstance) {
  await listLeagues(app);
}
