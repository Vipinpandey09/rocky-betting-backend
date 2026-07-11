import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly code = "APP_ERROR"
  ) {
    super(message);
  }
}

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
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

function isDatabaseSetupError(error: unknown) {
  return flattenErrorChain(error).some((entry) => {
    const code = "code" in entry ? String(entry.code) : "";
    const message = "message" in entry ? String(entry.message) : "";

    return (
      [
        "ECONNREFUSED",
        "ENOTFOUND",
        "3D000",
        "28P01",
        "42P01"
      ].includes(code) || /relation ".*" does not exist/i.test(message)
    );
  });
}

function flattenErrorChain(error: unknown): Array<Record<string, unknown>> {
  if (!error || typeof error !== "object") return [];

  const queue: unknown[] = [error];
  const seen = new Set<unknown>();
  const flattened: Array<Record<string, unknown>> = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;

    seen.add(current);
    flattened.push(current as Record<string, unknown>);

    if ("cause" in current && current.cause) {
      queue.push(current.cause);
    }

    if ("aggregateErrors" in current && Array.isArray(current.aggregateErrors)) {
      queue.push(...current.aggregateErrors);
    }
  }

  return flattened;
}
