import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { RESOURCE_CATALOG_CAPABILITY, RESOURCE_DELIVERY_CAPABILITY, type ResourceRecord } from './contracts.js';
import { allows } from './policy.js';
import { ResourceStore } from './store.js';

const maxPublishBytes = 100 * 1024 * 1024;
const body = async (request: IncomingMessage) => { const chunks: Buffer[] = []; let length = 0; for await (const chunk of request) { const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); length += value.length; if (length > maxPublishBytes) throw new Error('Published content exceeds 100 MiB'); chunks.push(value); } return Buffer.concat(chunks); };
const json = (response: ServerResponse, status: number, value: unknown) => { response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(value)); };
const application = (request: IncomingMessage) => { const value = request.headers['x-sema-application-key']; return typeof value === 'string' && value ? value : null; };
const admin = (request: IncomingMessage, key: string) => key !== 'replace-this-before-use' && request.headers['x-sema-admin-key'] === key;

export async function createResourceFacilityServer(store: ResourceStore, adminKey: string, policy?: { url: string; key: string }) {
  await store.initialize();
  const policyAllows = async (applicationKey: string, operation: string) => {
    if (!policy) return false;
    const response = await fetch(policy.url.replace(/\/$/, '') + '/v1/access/policy/evaluate', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sema-access-policy-key': policy.key }, body: JSON.stringify({ applicationKey, operation }) });
    if (!response.ok) return false; const result = await response.json() as { allowed?: unknown }; return result.allowed === true;
  };
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    try {
      if (request.method === 'GET' && url.pathname === '/v1/resources/health') return json(response, 200, { status: 'ACTIVE', facility: 'sema.foundation.resource', version: '0.2.0' });
      if (request.method === 'GET' && url.pathname === '/v1/resources/admin/index') {
        if (!admin(request, adminKey)) return json(response, 403, { error: 'Resource administration requires the facility service credential.' });
        const index = await store.load();
        return json(response, 200, { resources: index.resources.map(({ sha256: _sha256, ...resource }) => resource), grants: index.grants });
      }
      if (request.method === 'POST' && url.pathname === '/v1/resources/publish') {
        if (!admin(request, adminKey)) return json(response, 403, { error: 'Publish requires the facility service credential.' });
        const raw = request.headers['x-sema-resource']; if (typeof raw !== 'string') return json(response, 400, { error: 'x-sema-resource metadata is required.' });
        const metadata = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Omit<ResourceRecord, 'byteLength' | 'sha256' | 'publishedAt'>;
        if (!metadata.resourceId || !metadata.resourceVersionId || !metadata.workspaceId || !metadata.ownerId || !metadata.title || !metadata.mimeType || !metadata.source?.applicationKey) return json(response, 400, { error: 'Published resource metadata is incomplete.' });
        const resource = await store.publish(metadata, await body(request)); return json(response, 201, { resource });
      }
      if (request.method === 'POST' && url.pathname === '/v1/resources/grants') {
        if (!admin(request, adminKey)) return json(response, 403, { error: 'Grant administration requires the facility service credential.' });
        const grant = JSON.parse((await body(request)).toString('utf8')) as Omit<import('./contracts.js').ResourceGrant, 'grantId'>;
        if (!grant.workspaceId || !grant.consumerApplicationKey || !Array.isArray(grant.operations) || grant.operations.some(value => value !== 'catalog' && value !== 'read')) return json(response, 400, { error: 'Grant is invalid.' });
        return json(response, 201, { grant: await store.addGrant(grant) });
      }
      if (request.method === 'GET' && url.pathname === '/v1/resources/catalog') {
        const app = application(request); if (!app) return json(response, 401, { error: 'x-sema-application-key is required.' });
        if (!(await policyAllows(app, 'resource.catalog.read'))) return json(response, 403, { error: 'Application is not authorized to read the resource catalog.' });
        const index = await store.load(); const resources = index.resources.filter(resource => allows(index, resource, app, 'catalog')).map(({ sha256: _sha256, ...safe }) => safe);
        return json(response, 200, { capabilityKey: RESOURCE_CATALOG_CAPABILITY, contractVersion: '1.0.0', resources });
      }
      const match = /^\/v1\/resources\/([^/]+)\/([^/]+)\/content$/.exec(url.pathname);
      if (request.method === 'GET' && match) {
        const app = application(request); if (!app) return json(response, 401, { error: 'x-sema-application-key is required.' });
        if (!(await policyAllows(app, 'resource.content.read'))) return json(response, 403, { error: 'Application is not authorized to read resource content.' });
        const index = await store.load(); const resource = index.resources.find(candidate => candidate.resourceId === decodeURIComponent(match[1]) && candidate.resourceVersionId === decodeURIComponent(match[2]));
        if (!resource || !allows(index, resource, app, 'read')) return json(response, 404, { error: 'Resource is unavailable.' });
        const content = await store.content(resource); response.writeHead(200, { 'content-type': resource.mimeType, 'content-length': String(content.byteLength), 'cache-control': 'private, no-store', 'x-sema-delivery-capability': RESOURCE_DELIVERY_CAPABILITY }); return response.end(content);
      }
      return json(response, 404, { error: 'Resource Facility endpoint not found.' });
    } catch (error) { return json(response, 500, { error: error instanceof Error ? error.message : 'Resource Facility error', traceId: randomUUID() }); }
  });
}
