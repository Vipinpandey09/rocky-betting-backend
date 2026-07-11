import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Migrator, FileMigrationProvider } from "kysely";
import { db } from "../lib/db.js";
const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder: path.join(dirname, "migrations")
    })
});
const { error, results } = await migrator.migrateToLatest();
results?.forEach((result) => console.log(`${result.migrationName}: ${result.status}`));
if (error) {
    console.error(error);
    process.exit(1);
}
await db.destroy();
