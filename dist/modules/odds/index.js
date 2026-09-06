import { listOdds } from "./odds.routes.js";
export async function oddsRoutes(app) {
    await listOdds(app);
}
export { oddsService } from "./odds.service.js";
