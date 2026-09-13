/** Common shape used by every SEMA package's self-description. */
export function documentationManifest(input) {
    if (!input.packageName.startsWith('@selo/'))
        throw new Error('SEMA package names must use the @selo scope');
    return Object.freeze({ ...input, publicApi: [...input.publicApi], dependencies: [...(input.dependencies ?? [])], changeNotes: [...(input.changeNotes ?? [])] });
}
export function getFacilitiesDocumentation() {
    return documentationManifest({
        packageName: '@selo/sema-facilities', version: '0.1.0',
        summary: 'Minimal cross-application technical ports for errors, logging, settings, and package documentation.',
        publicApi: ['SemaError', 'Logger', 'SettingsStore', 'documentationManifest'],
        changeNotes: ['Initial portable facility contracts.'],
    });
}
//# sourceMappingURL=documentation.js.map