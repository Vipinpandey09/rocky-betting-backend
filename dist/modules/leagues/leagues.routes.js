import { listLeaguesController } from "./leagues.controller.js";
const basePath = "/api/leagues";
export async function listLeagues(app) {
    app.get(basePath, listLeaguesController);
}
