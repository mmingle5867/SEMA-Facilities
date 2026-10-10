import type { ResourceGrant, ResourceIndex, ResourceRecord } from './contracts.js';

/** Policy evaluation is intentionally independent of storage paths and provider applications. */
export function allows(index: ResourceIndex, resource: ResourceRecord, applicationKey: string, operation: 'catalog' | 'read') {
  const now = Date.now();
  return index.grants.some((grant: ResourceGrant) =>
    grant.workspaceId === resource.workspaceId && grant.consumerApplicationKey === applicationKey && grant.operations.includes(operation) &&
    !grant.revokedAt && (!grant.expiresAt || Date.parse(grant.expiresAt) > now) &&
    (!grant.resourceId || grant.resourceId === resource.resourceId) && (!grant.resourceVersionId || grant.resourceVersionId === resource.resourceVersionId));
}
