import { walletsService } from "./wallets.service.js";
export async function getWalletController(request) {
    return walletsService.getWallet(request.authUser.id);
}
export async function getTransactionsController(request) {
    return walletsService.history(request.authUser.id);
}
export async function depositController(request) {
    const { amount } = request.body;
    return walletsService.deposit(request.authUser.id, amount);
}
export async function withdrawController(request) {
    const { amount } = request.body;
    return walletsService.withdraw(request.authUser.id, amount);
}
