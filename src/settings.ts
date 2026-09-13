export interface SettingsStore { get(scope: string, key: string): Promise<unknown>; set(scope: string, key: string, value: unknown): Promise<void>; }

/** A small namespacing guard: settings cannot silently collide across packages. */
export function settingsKey(namespace: string, key: string) {
  const normalizedNamespace = namespace.trim().toLowerCase();
  const normalizedKey = key.trim().toLowerCase();
  if (!/^[a-z][a-z0-9.-]*$/.test(normalizedNamespace)) throw new Error('Invalid settings namespace');
  if (!/^[a-z][a-z0-9.-]*$/.test(normalizedKey)) throw new Error('Invalid settings key');
  return `${normalizedNamespace}.${normalizedKey}`;
}
