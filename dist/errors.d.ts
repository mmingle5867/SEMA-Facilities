export declare class SemaError extends Error {
    readonly code: string;
    readonly details: Record<string, unknown>;
    constructor(code: string, message: string, details?: Record<string, unknown>);
}
export declare function asSemaError(error: unknown): SemaError;
//# sourceMappingURL=errors.d.ts.map