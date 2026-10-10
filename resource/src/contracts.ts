export const RESOURCE_CATALOG_CAPABILITY = 'sema.foundation.resource.catalog';
export const RESOURCE_DELIVERY_CAPABILITY = 'sema.foundation.resource.delivery';

export type ResourceRecord = {
  resourceId: string;
  resourceVersionId: string;
  workspaceId: string;
  ownerId: string;
  title: string;
  role: string;
  mimeType: string;
  byteLength: number;
  sha256: string;
  publishedAt: string;
  source: { applicationKey: string; assetId?: string; assetVersionId?: string };
};

export type ResourceGrant = {
  grantId: string;
  workspaceId: string;
  consumerApplicationKey: string;
  resourceId?: string;
  resourceVersionId?: string;
  operations: Array<'catalog' | 'read'>;
  expiresAt?: string;
  revokedAt?: string;
};

export type ResourceIndex = { version: 1; resources: ResourceRecord[]; grants: ResourceGrant[] };
