/** Structured logging port. Apps choose console, local file, database, or remote adapters. */
export function log(logger, level, message, context = {}) {
    return logger.write({ timestamp: new Date(), level, message, context });
}
//# sourceMappingURL=logging.js.map