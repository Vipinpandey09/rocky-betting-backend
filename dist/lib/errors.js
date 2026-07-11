import { ZodError } from "zod";
export class AppError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 400, code = "APP_ERROR") {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
    }
}
export function errorHandler(error, request, reply) {
    request.log.error({ err: error }, error.message);
    if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
            error: error.code,
            message: error.message
        });
    }
    if (error.validation) {
        return reply.status(400).send({
            error: "VALIDATION_ERROR",
            message: "Invalid request payload",
            details: error.validation
        });
    }
    if (error instanceof ZodError) {
        return reply.status(400).send({
            error: "VALIDATION_ERROR",
            message: "Invalid request payload",
            details: error.flatten()
        });
    }
    if (isDatabaseSetupError(error)) {
        return reply.status(503).send({
            error: "DATABASE_UNAVAILABLE",
            message: "Database is not ready. Start Postgres, run migrations, then seed demo users."
        });
    }
    return reply.status(error.statusCode ?? 500).send({
        error: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong"
    });
}
function isDatabaseSetupError(error) {
    return flattenErrorChain(error).some((entry) => {
        const code = "code" in entry ? String(entry.code) : "";
        const message = "message" in entry ? String(entry.message) : "";
        return ([
            "ECONNREFUSED",
            "ENOTFOUND",
            "3D000",
            "28P01",
            "42P01"
        ].includes(code) || /relation ".*" does not exist/i.test(message));
    });
}
function flattenErrorChain(error) {
    if (!error || typeof error !== "object")
        return [];
    const queue = [error];
    const seen = new Set();
    const flattened = [];
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current || typeof current !== "object" || seen.has(current))
            continue;
        seen.add(current);
        flattened.push(current);
        if ("cause" in current && current.cause) {
            queue.push(current.cause);
        }
        if ("aggregateErrors" in current && Array.isArray(current.aggregateErrors)) {
            queue.push(...current.aggregateErrors);
        }
    }
    return flattened;
}
