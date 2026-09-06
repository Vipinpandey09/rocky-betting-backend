export const SocketEvents = {
  ODDS_UPDATED: "ODDS_UPDATED",
  MATCH_STARTED: "MATCH_STARTED",
  MATCH_FINISHED: "MATCH_FINISHED",
  MATCH_UPDATED: "MATCH_UPDATED",
  BET_PLACED: "BET_PLACED",
  BET_SETTLED: "BET_SETTLED",
  WALLET_UPDATED: "WALLET_UPDATED"
} as const;

export type SocketEvent = (typeof SocketEvents)[keyof typeof SocketEvents];
