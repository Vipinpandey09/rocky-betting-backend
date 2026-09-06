export async function up(db) {
    await db.schema
        .alterTable("matches")
        .addColumn("last_ball_started_at", "timestamptz")
        .addColumn("ball_number", "integer", (col) => col.defaultTo(0).notNull())
        .execute();
}
export async function down(db) {
    await db.schema
        .alterTable("matches")
        .dropColumn("last_ball_started_at")
        .dropColumn("ball_number")
        .execute();
}
