import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    request.body = schema.parse(request.body);
  };
}

export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    request.query = schema.parse(request.query);
  };
}

export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    request.params = schema.parse(request.params);
  };
}

export function validateRequest(options: {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
}) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (options.body) request.body = options.body.parse(request.body);
    if (options.query) request.query = options.query.parse(request.query);
    if (options.params) request.params = options.params.parse(request.params);
  };
}
