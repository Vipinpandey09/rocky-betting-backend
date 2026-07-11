import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { env } from "../config/env.js";
export const db = new Kysely({
    dialect: new PostgresDialect({
        pool: new pg.Pool({
            connectionString: env.DATABASE_URL,
            max: 10
        })
    })
});
