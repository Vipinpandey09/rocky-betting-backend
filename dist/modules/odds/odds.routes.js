import { listOddsController } from "./odds.controller.js";
const basePath = "/api/odds";
export async function listOdds(app) {
    app.get(basePath, listOddsController);
}
