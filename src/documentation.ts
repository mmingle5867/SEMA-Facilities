export interface DocumentationManifest {
  packageName: string;
  version: string;
  summary: string;
  publicApi: string[];
  dependencies?: string[];
  changeNotes?: string[];
}

/** Common shape used by every SEMA package's self-description. */
export function documentationManifest(input: DocumentationManifest): Readonly<DocumentationManifest> {
  if (!input.packageName.startsWith('@selo/')) throw new Error('SEMA package names must use the @selo scope');
  return Object.freeze({ ...input, publicApi: [...input.publicApi], dependencies: [...(input.dependencies ?? [])], changeNotes: [...(input.changeNotes ?? [])] });
}

export function getFoundationDocumentation() {
  return documentationManifest({
    packageName: '@selo/sema-foundation', version: '0.2.0',
    summary: 'Widely used foundation functions for errors, logging, settings, and package documentation.',
    publicApi: ['SemaError', 'Logger', 'SettingsStore', 'documentationManifest'],
    changeNotes: ['Initial portable foundation functions.', '0.2.0: package renamed from sema-facilities to sema-foundation; Foundation now means widely used functions, shared object definitions moved to sema-objects.'],
  });
}
