import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely";

export type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
export type Numeric = ColumnType<string, string | number, string | number>;

export interface RoleTable {
  id: Generated<string>;
  name: "USER" | "ADMIN";
  created_at: Timestamp;
}

export interface UserTable {
  id: Generated<string>;
  email: string;
  password_hash: string;
  name: string;
  role_id: string;
  status: "ACTIVE" | "SUSPENDED";
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface WalletTable {
  id: Generated<string>;
  user_id: string;
  balance: Numeric;
  currency: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface TransactionTable {
  id: Generated<string>;
  wallet_id: string;
  user_id: string;
  type: "DEPOSIT" | "WITHDRAW" | "CREDIT" | "DEBIT" | "PAYOUT" | "REFUND";
  amount: Numeric;
  status: "PENDING" | "COMPLETED" | "FAILED";
  reference: string | null;
  metadata: unknown;
  created_at: Timestamp;
}

export interface SportTable {
  id: Generated<string>;
  name: string;
  slug: string;
  active: boolean;
  created_at: Timestamp;
}

export interface LeagueTable {
  id: Generated<string>;
  sport_id: string;
  name: string;
  country: string;
  active: boolean;
  created_at: Timestamp;
}

export interface TeamTable {
  id: Generated<string>;
  sport_id: string;
  name: string;
  country: string;
  created_at: Timestamp;
}

export interface MatchTable {
  id: Generated<string>;
  sport_id: string;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  starts_at: Timestamp;
  status: "SCHEDULED" | "LIVE" | "FINISHED" | "CANCELLED";
  home_score: Generated<number>;
  away_score: Generated<number>;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_ball_started_at: Timestamp | null;
  ball_number: Generated<number>;
}

export interface MarketTable {
  id: Generated<string>;
  match_id: string;
  name: string;
  type: "MATCH_WINNER" | "TOTALS" | "HANDICAP";
  status: "OPEN" | "SUSPENDED" | "SETTLED";
  created_at: Timestamp;
}

export interface OddTable {
  id: Generated<string>;
  market_id: string;
  selection_name: string;
  price: Numeric;
  status: "ACTIVE" | "SUSPENDED";
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface BetTable {
  id: Generated<string>;
  user_id: string;
  stake: Numeric;
  total_odds: Numeric;
  potential_payout: Numeric;
  status: "PENDING" | "WON" | "LOST" | "VOID";
  created_at: Timestamp;
  settled_at: Timestamp | null;
}

export interface BetSelectionTable {
  id: Generated<string>;
  bet_id: string;
  odd_id: string;
  market_id: string;
  match_id: string;
  selection_name: string;
  price: Numeric;
  result: "PENDING" | "WON" | "LOST" | "VOID";
}

export interface DepositTable {
  id: Generated<string>;
  user_id: string;
  amount: Numeric;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REJECTED";
  created_at: Timestamp;
}

export interface WithdrawalTable {
  id: Generated<string>;
  user_id: string;
  amount: Numeric;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID" | "COMPLETED";
  created_at: Timestamp;
}

export interface NotificationTable {
  id: Generated<string>;
  user_id: string;
  title: string;
  body: string;
  read_at: Timestamp | null;
  created_at: Timestamp;
}

export interface AuditLogTable {
  id: Generated<string>;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: unknown;
  created_at: Timestamp;
}

export interface Database {
  roles: RoleTable;
  users: UserTable;
  wallets: WalletTable;
  transactions: TransactionTable;
  sports: SportTable;
  leagues: LeagueTable;
  teams: TeamTable;
  matches: MatchTable;
  markets: MarketTable;
  odds: OddTable;
  bets: BetTable;
  bet_selections: BetSelectionTable;
  deposits: DepositTable;
  withdrawals: WithdrawalTable;
  notifications: NotificationTable;
  audit_logs: AuditLogTable;
}

export type User = Selectable<UserTable>;
export type NewUser = Insertable<UserTable>;
export type UserUpdate = Updateable<UserTable>;
