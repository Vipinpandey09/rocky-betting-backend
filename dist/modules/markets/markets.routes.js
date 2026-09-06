import { listMarketsController } from "./markets.controller.js";
const basePath = "/api/markets";
export async function listMarkets(app) {
    app.get(basePath, listMarketsController);
}
