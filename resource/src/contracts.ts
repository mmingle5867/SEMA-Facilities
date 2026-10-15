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
  /** The group this file was shared in, when it was shared with others (for example every file of one artwork). */
  groupId?: string;
};

/** A category as it was when the group was shared: its ID, its name and its full path from the top. */
export type SharedCategory = { categoryId: string; name: string; path: string[] };

/**
 * Files shared together, with what describes them as a whole. The group's ID is the ID of the thing they came from,
 * such as the artwork, so sharing again updates the same group and no new ID is used. Which files belong to it is
 * read from the files' own groupId; the group keeps no list of them. Description and categories are as they were
 * when shared, so a consumer has them even when the source application is closed.
 */
export type ResourceGroup = {
  groupId: string;
  workspaceId: string;
  ownerId: string;
  title: string;
  description?: string;
  categories: SharedCategory[];
  source: { applicationKey: string; artworkId?: string };
  updatedAt: string;
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

export type ResourceIndex = { version: 1; resources: ResourceRecord[]; grants: ResourceGrant[]; groups: ResourceGroup[] };
