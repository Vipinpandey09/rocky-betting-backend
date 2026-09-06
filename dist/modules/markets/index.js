import { listMarkets } from "./markets.routes.js";
export async function marketsRoutes(app) {
    await listMarkets(app);
}
