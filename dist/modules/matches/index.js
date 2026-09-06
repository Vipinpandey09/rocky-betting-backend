import { registerRoutes, getMatchDetail, getLiveCricket } from "./matches.routes.js";
export async function matchesRoutes(app) {
    await registerRoutes(app);
    await getMatchDetail(app);
    await getLiveCricket(app);
}
export { matchesService } from "./matches.service.js";
