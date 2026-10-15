import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createResourceServer } from '../src/server.js';
import { ResourceStore } from '../src/store.js';

// A stand-in for Foundation Access that allows every application operation, so these checks are about Resource alone.
const access = createServer((_request, response) => { response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify({ allowed: true })); });
await new Promise<void>((resolve) => access.listen(0, '127.0.0.1', resolve));
const dir = await mkdtemp(join(tmpdir(), 'sema-resource-'));
const server = await createResourceServer(new ResourceStore(dir), 'admin', { url: `http://127.0.0.1:${(access.address() as AddressInfo).port}`, key: 'policy' });
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1/resources`;
const admin = { 'x-sema-admin-key': 'admin', 'content-type': 'application/json' };
const json = async (response: Response) => ({ status: response.status, body: await response.json() as any });
const saveGroup = (group: unknown) => fetch(`${base}/groups`, { method: 'POST', headers: admin, body: JSON.stringify(group) }).then(json);
const publish = (metadata: Record<string, unknown>, content: string) => fetch(`${base}/publish`, { method: 'POST', headers: { 'x-sema-admin-key': 'admin', 'x-sema-resource': Buffer.from(JSON.stringify(metadata)).toString('base64url'), 'content-type': String(metadata.mimeType) }, body: content }).then(json);
const file = (resourceId: string, resourceVersionId: string, role: string, mimeType: string, extra: Record<string, unknown> = {}) => ({ resourceId, resourceVersionId, workspaceId: '3-9rL', ownerId: '3-9rH', title: 'Bunny', role, mimeType, source: { applicationKey: 'vectorforge', assetId: resourceId, assetVersionId: resourceVersionId }, ...extra });

try {
  // A group is the artwork the files came from: its description and its categories as they were when shared.
  const group = { groupId: '3-4hn', workspaceId: '3-9rL', ownerId: '3-9rH', title: 'Bunny', description: 'A rabbit in a spring meadow.', categories: [{ categoryId: '3-6A', name: 'Easter', path: ['Holidays', 'Easter'] }], source: { applicationKey: 'vectorforge', artworkId: '3-4hn' } };
  assert.equal((await saveGroup({ ...group, title: '' })).status, 400, 'a group needs a title');
  assert.equal((await saveGroup({ ...group, categories: [{ categoryId: '3-6A', name: 'Easter' }] })).status, 400, 'a category needs its path');
  assert.equal((await saveGroup(group)).status, 200);
  assert.equal((await fetch(`${base}/groups`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(group) })).status, 403, 'only the service credential may save a group');

  // Files are published into the group. A file naming a group that does not exist is refused.
  assert.equal((await publish(file('3-a1', '3-v1', 'approved-svg', 'image/svg+xml', { groupId: '3-zz' }), '<svg/>')).status, 400);
  assert.equal((await publish(file('3-a1', '3-v1', 'approved-svg', 'image/svg+xml', { groupId: '3-4hn' }), '<svg/>')).status, 201);
  assert.equal((await publish(file('3-a2', '3-v2', 'approved-png', 'image/png', { groupId: '3-4hn' }), 'png-bytes')).status, 201);
  assert.equal((await publish(file('3-a9', '3-v9', 'approved-png', 'image/png', { workspaceId: '3-OTHER' }), 'other')).status, 201, 'a file with no group still publishes, as before');

  // Sharing again updates the same group.
  assert.equal((await saveGroup({ ...group, description: 'A rabbit in a spring meadow, with eggs.' })).body.group.description, 'A rabbit in a spring meadow, with eggs.');

  // The catalog: nothing until a grant; then the files and their group, with the description and categories.
  const catalog = () => fetch(`${base}/catalog`, { headers: { 'x-sema-application-key': 'listingforge' } }).then(json);
  assert.deepEqual((await catalog()).body.resources, []);
  assert.deepEqual((await catalog()).body.groups, [], 'no visible file, no visible group');
  assert.equal((await fetch(`${base}/grants`, { method: 'POST', headers: admin, body: JSON.stringify({ workspaceId: '3-9rL', consumerApplicationKey: 'listingforge', operations: ['catalog', 'read'] }) })).status, 201);
  const seen = (await catalog()).body;
  assert.equal(seen.contractVersion, '1.1.0');
  assert.deepEqual(seen.resources.map((resource: any) => [resource.resourceId, resource.groupId]), [['3-a1', '3-4hn'], ['3-a2', '3-4hn']], 'the other workspace is not shown');
  assert.equal(seen.groups.length, 1);
  assert.deepEqual([seen.groups[0].groupId, seen.groups[0].description, seen.groups[0].categories[0].path], ['3-4hn', 'A rabbit in a spring meadow, with eggs.', ['Holidays', 'Easter']]);
  assert.equal((await fetch(`${base}/3-a2/3-v2/content`, { headers: { 'x-sema-application-key': 'listingforge' } }).then((response) => response.text())), 'png-bytes');

  // The administrator's index lists the groups too.
  assert.equal((await fetch(`${base}/admin/index`, { headers: admin }).then(json)).body.groups.length, 1);
  console.log('Foundation Resource smoke test passed.');
} finally {
  server.close(); access.close();
  await rm(dir, { recursive: true, force: true });
}
