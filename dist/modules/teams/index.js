import { listTeams } from "./teams.routes.js";
export async function teamsRoutes(app) {
    await listTeams(app);
}
