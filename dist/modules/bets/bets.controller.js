import { betsService } from "./bets.service.js";
export async function listBetsController(request) {
    return betsService.list(request.authUser.id);
}
export async function placeBetController(request) {
    const body = request.body;
    return betsService.place(request.authUser.id, body);
}
