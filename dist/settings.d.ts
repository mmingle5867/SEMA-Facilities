export interface SettingsStore {
    get(scope: string, key: string): Promise<unknown>;
    set(scope: string, key: string, value: unknown): Promise<void>;
}
/** A small namespacing guard: settings cannot silently collide across packages. */
export declare function settingsKey(namespace: string, key: string): string;
//# sourceMappingURL=settings.d.ts.map