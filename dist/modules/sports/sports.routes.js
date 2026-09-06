import { validateParams } from "../../lib/validation.js";
import { sportParamsSchema } from "./sports.schemas.js";
import { getLeaguesBySportController, listSportsController } from "./sports.controller.js";
const basePath = "/api/sports";
export async function listSports(app) {
    app.get(basePath, listSportsController);
}
export async function getLeaguesBySport(app) {
    app.get("/api/apisports/:sport/leagues", { preHandler: [validateParams(sportParamsSchema)] }, getLeaguesBySportController);
}
