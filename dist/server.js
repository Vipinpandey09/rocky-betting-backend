import cors from "@fastify/cors";
import jwtPlugin from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Migrator, FileMigrationProvider } from "kysely";
import { db } from "./lib/db.js";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import { corsOrigins, env } from "./config/env.js";
import { errorHandler } from "./lib/errors.js";
import { registerRoutes } from "./routes/index.js";
import { registerSocket } from "./websocket/socket.js";
import { searchService } from "./modules/search/index.js";
const app = Fastify({
    logger: {
        level: env.NODE_ENV === "production" ? "info" : "debug"
    }
});
app.setErrorHandler(errorHandler);
await app.register(cors, { origin: corsOrigins, credentials: true });
await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });
await app.register(jwtPlugin, { secret: env.JWT_ACCESS_SECRET });
await app.register(swagger, {
    openapi: {
        info: {
            title: "Rocky Sportsbook API",
            version: "1.0.0"
        },
        servers: [{ url: "http://localhost:8000" }],
        components: {
            securitySchemes: {
                bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
            }
        }
    }
});
await app.register(swaggerUi, { routePrefix: "/docs" });
await registerRoutes(app);
registerSocket(app);
await searchService.ensureIndexes().catch((error) => {
    app.log.warn({ error }, "Elasticsearch indexes were not initialized");
});
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder: path.join(__dirname, "database", "migrations")
    })
});
const { error: migrationError, results } = await migrator.migrateToLatest();
results?.forEach((result) => app.log.info(`Migration ${result.migrationName}: ${result.status}`));
if (migrationError) {
    app.log.error(migrationError, "Failed to run database migrations");
}
const start = async () => {
    try {
        await app.listen({ port: env.PORT, host: "0.0.0.0" });
    }
    catch (error) {
        app.log.error(error);
        process.exit(1);
    }
};
// Initialize and launch the fastify app
void start();
