import { liveCasinoDataService } from "./live-casino.service.js";
import { walletsService } from "../wallets/wallets.service.js";
import { AppError } from "../../lib/errors.js";
export async function getGamesController(request) {
    const { window } = request.query;
    return liveCasinoDataService.getGames(window);
}
export async function getGameController(request) {
    const { slug } = request.params;
    return liveCasinoDataService.getGame(slug);
}
export async function getStatsController() {
    return liveCasinoDataService.getStats();
}
export async function getFairnessController() {
    return liveCasinoDataService.getFairness();
}
export async function placeCasinoBetController(request) {
    const userId = request.authUser.id;
    const { slug, stake, choice } = request.body;
    if (!stake || stake <= 0) {
        throw new AppError("Invalid bet amount", 400, "INVALID_BET_AMOUNT");
    }
    // 1. Get current balance and check
    const wallet = await walletsService.getWallet(userId);
    if (Number(wallet.balance) < stake) {
        throw new AppError("Insufficient balance", 400, "INSUFFICIENT_FUNDS");
    }
    // 2. Perform game outcome roll
    let win = false;
    let multiplier = 0;
    let rolledValue = "";
    let detail = "";
    if (slug === "roulette") {
        const roll = Math.floor(Math.random() * 37);
        const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        const isRed = redNumbers.includes(roll);
        const color = roll === 0 ? "green" : isRed ? "red" : "black";
        const isEven = roll !== 0 && roll % 2 === 0;
        rolledValue = `${roll} (${color})`;
        if (choice === "red" && color === "red") {
            win = true;
            multiplier = 2;
        }
        else if (choice === "black" && color === "black") {
            win = true;
            multiplier = 2;
        }
        else if (choice === "even" && isEven) {
            win = true;
            multiplier = 2;
        }
        else if (choice === "odd" && !isEven && roll !== 0) {
            win = true;
            multiplier = 2;
        }
        else if (choice === String(roll)) {
            win = true;
            multiplier = 35;
        }
        detail = `Rolled ${rolledValue}. You bet on ${choice}.`;
    }
    else if (slug === "slots") {
        const symbols = ["🍒", "🍋", "🍊", "🔔", "👑", "💎"];
        const slot1 = symbols[Math.floor(Math.random() * symbols.length)];
        const slot2 = symbols[Math.floor(Math.random() * symbols.length)];
        const slot3 = symbols[Math.floor(Math.random() * symbols.length)];
        rolledValue = `${slot1} | ${slot2} | ${slot3}`;
        if (slot1 === slot2 && slot2 === slot3) {
            win = true;
            multiplier = slot1 === "💎" ? 15 : slot1 === "👑" ? 10 : 5;
        }
        else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
            win = true;
            multiplier = 1.5;
        }
        detail = `Spun ${rolledValue}.`;
    }
    else {
        // 48% default win chance
        win = Math.random() < 0.48;
        multiplier = win ? 2 : 0;
        rolledValue = win ? "WIN" : "LOSE";
        detail = "General game simulated outcome.";
    }
    // 3. Process Wallet movement
    // Debit stake
    await walletsService.debit(userId, stake);
    let payout = 0;
    if (win) {
        payout = stake * multiplier;
        // Credit payout
        await walletsService.credit(userId, payout, "PAYOUT");
    }
    const nextWallet = await walletsService.getWallet(userId);
    return {
        win,
        payout,
        rolledValue,
        detail,
        balance: Number(nextWallet.balance)
    };
}
