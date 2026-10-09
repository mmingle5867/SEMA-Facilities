export interface DocumentationManifest {
    packageName: string;
    version: string;
    summary: string;
    publicApi: string[];
    dependencies?: string[];
    changeNotes?: string[];
}
/** Common shape used by every SEMA package's self-description. */
export declare function documentationManifest(input: DocumentationManifest): Readonly<DocumentationManifest>;
export declare function getFoundationDocumentation(): Readonly<DocumentationManifest>;
//# sourceMappingURL=documentation.d.ts.map