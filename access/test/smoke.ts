import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AuthStore } from '../src/auth-store.js';
import { AccessStore } from '../src/store.js';
import { CoreClient } from '../src/core-client.js';
import { createAccessServer } from '../src/server.js';

let sequence = 0;
const core = createServer(async (request, response) => {
  if (request.method === 'POST' && request.url === '/v1/core/identifiers/reservations') {
    sequence += 1;
    response.writeHead(201, { 'content-type': 'application/json' });
    return response.end(JSON.stringify({ reservation: { id: `reservation-${sequence}` }, identifiers: [{ id: `3-${sequence}` }] }));
  }
  if (request.method === 'POST' && (request.url === '/v1/core/identifiers/consume' || request.url === '/v1/core/runtime/audits')) { response.writeHead(200, { 'content-type': 'application/json' }); return response.end('{}'); }
  response.writeHead(404); response.end();
});
await new Promise<void>((resolve) => core.listen(4319, '127.0.0.1', resolve));
const dataDirectory = await mkdtemp(join(tmpdir(), 'sema-foundation-access-'));
const store = new AccessStore(dataDirectory);
const authStore = new AuthStore(dataDirectory);
await store.initialize();
await authStore.initialize();
const access = createAccessServer({ store, authStore, core: new CoreClient('http://127.0.0.1:4319'), adminKey: 'admin', bootstrapKey: 'bootstrap', policyKey: 'policy', sessionKey: 'a-local-test-session-key-that-is-long-enough', sessionTtlMinutes: 60 });
await new Promise<void>((resolve) => access.listen(4349, '127.0.0.1', resolve));
try {
  const bootstrap = await fetch('http://127.0.0.1:4349/v1/access/bootstrap', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sema-access-bootstrap-key': 'bootstrap' }, body: JSON.stringify({ userDisplayName: 'Mike Mingle', email: 'mike@example.test', organizationDisplayName: 'NEO Software', workspaces: ['Software Development', 'Artwork & Production'], rootNodeDisplayName: 'NEO Software Local Node' }) });
  assert.equal(bootstrap.status, 201);
  const initial = await bootstrap.json() as { user: { id: string }; organization: { id: string }; rootNode: { id: string } };
  const personResponse = await fetch('http://127.0.0.1:4349/v1/access/users', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sema-access-admin-key': 'admin' }, body: JSON.stringify({ displayName: 'New Person' }) });
  assert.equal(personResponse.status, 201);
  const person = await personResponse.json() as { user: { id: string; email?: string } };
  assert.equal(person.user.email, undefined);
  const personCredentials = await fetch(`http://127.0.0.1:4349/v1/access/users/${person.user.id}/credentials`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-sema-access-admin-key': 'admin' }, body: JSON.stringify({ email: 'new.person@example.test', password: 'a-secure-local-test-password' }) });
  assert.equal(personCredentials.status, 200);
  const personMembership = await fetch('http://127.0.0.1:4349/v1/access/memberships', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sema-access-admin-key': 'admin' }, body: JSON.stringify({ userId: person.user.id, organizationId: initial.organization.id, roleKeys: ['workspace.member'] }) });
  assert.equal(personMembership.status, 201);
  const profile = await fetch(`http://127.0.0.1:4349/v1/access/users/${initial.user.id}/profile`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-sema-access-admin-key': 'admin' }, body: JSON.stringify({ displayName: 'Michael Mingle' }) });
  assert.equal(profile.status, 200);
  const credentials = await fetch(`http://127.0.0.1:4349/v1/access/users/${initial.user.id}/credentials`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-sema-access-admin-key': 'admin' }, body: JSON.stringify({ email: 'mike@example.test', password: 'a-secure-local-test-password' }) });
  assert.equal(credentials.status, 200);
  const rejectedLogin = await fetch('http://127.0.0.1:4349/v1/access/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'mike@example.test', password: 'incorrect-password' }) });
  assert.equal(rejectedLogin.status, 401);
  const login = await fetch('http://127.0.0.1:4349/v1/access/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'mike@example.test', password: 'a-secure-local-test-password' }) });
  assert.equal(login.status, 200);
  const signedIn = await login.json() as { accessToken: string };
  const me = await fetch('http://127.0.0.1:4349/v1/access/auth/me', { headers: { authorization: `Bearer ${signedIn.accessToken}` } });
  assert.equal(me.status, 200);
  const logout = await fetch('http://127.0.0.1:4349/v1/access/auth/logout', { method: 'POST', headers: { authorization: `Bearer ${signedIn.accessToken}` } });
  assert.equal(logout.status, 200);
  const expired = await fetch('http://127.0.0.1:4349/v1/access/auth/me', { headers: { authorization: `Bearer ${signedIn.accessToken}` } });
  assert.equal(expired.status, 401);
  const nodeResponse = await fetch('http://127.0.0.1:4349/v1/access/nodes', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sema-access-admin-key': 'admin' }, body: JSON.stringify({ displayName: 'Ohio Region', issuingParentNodeId: initial.rootNode.id, operationalParentNodeId: initial.rootNode.id, controllerOrganizationId: initial.organization.id, classification: 'region' }) });
  assert.equal(nodeResponse.status, 201);
  const node = await nodeResponse.json() as { id: string; issuingParentNodeId: string };
  assert.equal(node.issuingParentNodeId, initial.rootNode.id);
  const application = await fetch('http://127.0.0.1:4349/v1/access/applications/import', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sema-access-admin-key': 'admin' }, body: JSON.stringify({ applicationKey: 'vectorforge', displayName: 'VectorForge', version: '0.71.3', manifest: { declaredActions: ['asset.import', 'asset.publish'] } }) });
  assert.equal(application.status, 201);
  const applicationRecord = await application.json() as { id: string };
  const noteResponse = await fetch('http://127.0.0.1:4349/v1/access/testing-notes', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sema-access-admin-key': 'admin' }, body: JSON.stringify({ subjectKind: 'APPLICATION', subjectId: applicationRecord.id, kind: 'CHANGE_REQUEST', priority: 'NORMAL', title: 'Add clear test feedback', detail: 'Capture review notes for later implementation.' }) });
  assert.equal(noteResponse.status, 201);
  const note = await noteResponse.json() as { id: string };
  const packetResponse = await fetch('http://127.0.0.1:4349/v1/access/change-packets', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sema-access-admin-key': 'admin' }, body: JSON.stringify({ noteIds: [note.id] }) });
  assert.equal(packetResponse.status, 201);
  const coreNoteResponse = await fetch('http://127.0.0.1:4349/v1/access/testing-notes', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sema-access-admin-key': 'admin' }, body: JSON.stringify({ subjectKind: 'CORE', subjectId: 'sema.core', kind: 'TEST_NOTE', priority: 'LOW', title: 'Core health note', detail: 'Capture a Core-specific testing note.' }) });
  assert.equal(coreNoteResponse.status, 201);
  const grant = await fetch('http://127.0.0.1:4349/v1/access/grants', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sema-access-admin-key': 'admin' }, body: JSON.stringify({ granteeKind: 'APPLICATION', granteeId: applicationRecord.id, operations: ['core.identifiers.*'] }) });
  assert.equal(grant.status, 201);
  const decision = await fetch('http://127.0.0.1:4349/v1/access/policy/evaluate', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sema-access-policy-key': 'policy' }, body: JSON.stringify({ applicationKey: 'vectorforge', operation: 'core.identifiers.reserve' }) });
  assert.deepEqual(await decision.json(), { allowed: true, applicationKey: 'vectorforge', operation: 'core.identifiers.reserve' });
  const catalog = await fetch('http://127.0.0.1:4349/v1/access/catalog/releases', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sema-access-admin-key': 'admin' }, body: JSON.stringify({ capabilityKey: 'sema.image.vectorize', providerKey: 'selo', serviceKey: 'vectorize.local', version: '1.0.0', displayName: 'Local Vectorize' }) });
  assert.equal(catalog.status, 201);
  const release = await catalog.json() as { id: string };
  const transition = await fetch(`http://127.0.0.1:4349/v1/access/catalog/releases/${release.id}/transition`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-sema-access-admin-key': 'admin' }, body: JSON.stringify({ trustStatus: 'VERIFIED', status: 'ACTIVE' }) });
  assert.equal(transition.status, 200);
  console.log('Foundation Access smoke test passed.');
} finally {
  await new Promise<void>((resolve, reject) => access.close((error) => error ? reject(error) : resolve()));
  await new Promise<void>((resolve, reject) => core.close((error) => error ? reject(error) : resolve()));
}
