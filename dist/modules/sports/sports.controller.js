import { db } from "../../lib/db.js";
import { apiSportsService } from "../../services/api-sports.service.js";
export async function listSportsController() {
    return db.selectFrom("sports").selectAll().where("active", "=", true).execute();
}
export async function getLeaguesBySportController(request) {
    const { sport } = request.params;
    return apiSportsService.getLeagues(sport);
}
