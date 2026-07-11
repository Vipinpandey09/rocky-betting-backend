import type { FastifyInstance } from "fastify";
import { listTeamsController } from "./teams.controller.js";

const basePath = "/api/teams";

export async function listTeams(app: FastifyInstance) {
  app.get(basePath, listTeamsController);
}
