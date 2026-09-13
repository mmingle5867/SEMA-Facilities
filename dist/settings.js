/** A small namespacing guard: settings cannot silently collide across packages. */
export function settingsKey(namespace, key) {
    const normalizedNamespace = namespace.trim().toLowerCase();
    const normalizedKey = key.trim().toLowerCase();
    if (!/^[a-z][a-z0-9.-]*$/.test(normalizedNamespace))
        throw new Error('Invalid settings namespace');
    if (!/^[a-z][a-z0-9.-]*$/.test(normalizedKey))
        throw new Error('Invalid settings key');
    return `${normalizedNamespace}.${normalizedKey}`;
}
//# sourceMappingURL=settings.js.map