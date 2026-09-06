import { listSports, getLeaguesBySport } from "./sports.routes.js";
export async function sportsRoutes(app) {
    await listSports(app);
    await getLeaguesBySport(app);
}
