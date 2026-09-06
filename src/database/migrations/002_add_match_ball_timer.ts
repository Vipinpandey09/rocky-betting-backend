import { type Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("matches")
    .addColumn("last_ball_started_at", "timestamptz")
    .addColumn("ball_number", "integer", (col) => col.defaultTo(0).notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("matches")
    .dropColumn("last_ball_started_at")
    .dropColumn("ball_number")
    .execute();
}
