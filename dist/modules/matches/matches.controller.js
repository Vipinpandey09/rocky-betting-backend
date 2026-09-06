import { cricketService } from "../../services/cricket.service.js";
import { theOddsApiService } from "../../services/the-odds-api.service.js";
import { matchesService } from "./matches.service.js";
export async function listMatchesController(request) {
    const { status } = request.query;
    try {
        await Promise.all([
            theOddsApiService.syncMatchesToDatabase("cricket"),
            theOddsApiService.syncMatchesToDatabase("football"),
            theOddsApiService.syncMatchesToDatabase("volleyball")
        ]);
    }
    catch (error) {
        request.log.error(error, "Failed to sync The Odds API matches");
    }
    return matchesService.list(status);
}
export async function getMatchDetailController(request) {
    const { id } = request.params;
    return matchesService.detail(id);
}
export async function getLiveCricketController() {
    return cricketService.getLiveMatchSummaries();
}
