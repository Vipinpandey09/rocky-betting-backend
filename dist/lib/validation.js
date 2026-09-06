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
export function validateParams(schema) {
    return async (request, _reply) => {
        request.params = schema.parse(request.params);
    };
}
export function validateRequest(options) {
    return async (request, _reply) => {
        if (options.body)
            request.body = options.body.parse(request.body);
        if (options.query)
            request.query = options.query.parse(request.query);
        if (options.params)
            request.params = options.params.parse(request.params);
    };
}
