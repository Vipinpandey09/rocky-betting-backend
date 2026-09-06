import { type Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Delete all existing matches and their dependents (clearing out existing mock matches)
  await db.deleteFrom("bet_selections").execute();
  await db.deleteFrom("bets").execute();
  await db.deleteFrom("odds").execute();
  await db.deleteFrom("markets").execute();
  await db.deleteFrom("matches").execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // No-op
}
