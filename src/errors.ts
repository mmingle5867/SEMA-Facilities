export class SemaError extends Error {
  constructor(public readonly code: string, message: string, public readonly details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'SemaError';
  }
}

export function asSemaError(error: unknown) {
  if (error instanceof SemaError) return error;
  return new SemaError('UNEXPECTED', error instanceof Error ? error.message : String(error));
}
