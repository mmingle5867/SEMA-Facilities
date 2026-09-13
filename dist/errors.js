export class SemaError extends Error {
    code;
    details;
    constructor(code, message, details = {}) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'SemaError';
    }
}
export function asSemaError(error) {
    if (error instanceof SemaError)
        return error;
    return new SemaError('UNEXPECTED', error instanceof Error ? error.message : String(error));
}
//# sourceMappingURL=errors.js.map