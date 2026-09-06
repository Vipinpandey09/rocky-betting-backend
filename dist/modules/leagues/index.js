import { listLeagues } from "./leagues.routes.js";
export async function leaguesRoutes(app) {
    await listLeagues(app);
}
