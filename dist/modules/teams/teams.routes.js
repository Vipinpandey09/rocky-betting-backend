import { listTeamsController } from "./teams.controller.js";
const basePath = "/api/teams";
export async function listTeams(app) {
    app.get(basePath, listTeamsController);
}
