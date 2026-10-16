import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CoreClient, type CoreRequestSigner } from '../src/core-client.js';

// Foundation Access against a real Core host: it registers its key with its secret once, then issues IDs and records
// audit entries with signed requests. Core's folder is SEMA_CORE_DIRECTORY, or SEMA-Core beside SEMA-Foundation.
const coreDirectory = resolve(process.env.SEMA_CORE_DIRECTORY ?? join(process.cwd(), '..', '..', 'SEMA-Core'));
const hostDirectory = resolve(process.env.SEMA_CORE_HOST_DIRECTORY ?? coreDirectory);
const sema = await import(pathToFileURL(join(hostDirectory, 'dist', 'index.js')).href);
const { openCoreClientSigning } = await import(pathToFileURL(join(coreDirectory, 'dist', 'keys', 'client-signing.js')).href);
const granted = new Set(['core.identifiers.reserve', 'core.identifiers.consume', 'core.audits.record']);
const store = new sema.InMemorySemaCoreHostStore();
const core = new sema.SemaCore(store, { installationId: '3', maxReservationSize: 25 });
const clients = new sema.InMemoryClientKeyStore();
const host = new sema.SemaCoreHost(core, store, { canRead: async ({ resource }: { resource: string }) => granted.has(resource), canAdminister: async ({ resource }: { resource: string }) => granted.has(resource) }, undefined, undefined, undefined, { machine: await new sema.MemoryKeyStore().open(), clients, nonces: new sema.NonceMemory() });
await host.initialize({ actorId: 'sema.foundation.access' });
const server = await sema.startCoreHostHttpServer(host, { port: 0, applicationClients: [{ applicationKey: 'sema.foundation.access', secret: 'access-secret' }] });
const coreUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const folder = mkdtempSync(join(tmpdir(), 'sema-access-key-'));
try {
  const signer = await openCoreClientSigning({ keyFile: join(folder, 'access-key'), coreUrl, applicationKey: 'sema.foundation.access', secret: 'access-secret' }) as CoreRequestSigner;
  const client = new CoreClient(coreUrl, 'sema.foundation.access', 'access-secret', signer);
  assert.equal(client.proof, 'signed');
  const id = await client.issue('USER', { purpose: 'test' });
  assert.match(id, /^3-/, 'an ID issued by Core, through signed requests');
  assert.deepEqual((await clients.list('sema.foundation.access')).map((key: { keyId: string }) => key.keyId), [signer.keyId], 'registered on the way');
  await client.audit('access.test', [id], { note: 'signed' });
  assert.ok((store.audits as Array<{ action: string }>).some((entry) => entry.action === 'access.test'), 'the audit entry reached Core through a signed request');
  assert.equal(new CoreClient(coreUrl, 'sema.foundation.access', 'access-secret').proof, 'key and secret', 'without a signer it still uses its key and secret');
} finally {
  server.close();
  rmSync(folder, { recursive: true, force: true });
}
console.log('Foundation Access signing test passed.');
