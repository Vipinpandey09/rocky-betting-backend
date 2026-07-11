export function validateBody(schema) {
    return async (request, _reply) => {
        request.body = schema.parse(request.body);
    };
}
export function validateQuery(schema) {
    return async (request, _reply) => {
        request.query = schema.parse(request.query);
    };
}
