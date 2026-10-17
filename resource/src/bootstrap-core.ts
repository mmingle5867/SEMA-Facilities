import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { RESOURCE_CATALOG_CAPABILITY, RESOURCE_DELIVERY_CAPABILITY } from './contracts.js';

/**
 * One-time set-up: registers Foundation Resource's two capabilities with Core. Run by hand (npm run sema:core:bootstrap).
 *
 * The requests are signed with Resource's own key (RFC 9421), using Core's shared client code from Core's folder
 * (SEMA_CORE_DIRECTORY, or SEMA-Core beside SEMA-Foundation). Resource proves who it is with its key and secret only to
 * register that key. Like anything that calls Core, it needs three things set up first: its own key and secret in
 * Resource's .env, an entry for that key in Core's SEMA_APPLICATION_CLIENTS_JSON, and an application record in
 * Foundation Access with a grant for core.capabilities.register.
 */
const core = (process.env.SEMA_CORE_URL ?? 'http://127.0.0.1:4310').replace(/\/$/, '');
const facility = (process.env.SEMA_RESOURCE_URL ?? process.env.SEMA_RESOURCE_FACILITY_URL ?? 'http://127.0.0.1:4330').replace(/\/$/, '');
const applicationKey = process.env.SEMA_RESOURCE_CORE_APPLICATION_KEY ?? 'sema.foundation.resource';
const secret = process.env.SEMA_RESOURCE_CORE_APPLICATION_SECRET;
if (!secret) throw new Error(`SEMA_RESOURCE_CORE_APPLICATION_SECRET is not set. Resource needs its own key and secret to register its signing key with Core: set SEMA_RESOURCE_CORE_APPLICATION_KEY (default ${applicationKey}) and SEMA_RESOURCE_CORE_APPLICATION_SECRET in Resource's .env, add the same key and secret to Core's SEMA_APPLICATION_CLIENTS_JSON, and in Foundation Access give that application a grant for core.capabilities.register.`);

type Signing = { keyId: string; fetch(method: string, url: URL, body?: Buffer, headers?: Record<string, string>): Promise<Response> };
const coreDirectory = resolve(process.env.SEMA_CORE_DIRECTORY ?? join(process.cwd(), '..', '..', 'SEMA-Core'));
const { openCoreClientSigning } = await import(pathToFileURL(join(coreDirectory, 'dist', 'keys', 'client-signing.js')).href) as { openCoreClientSigning(input: { keyFile: string; coreUrl: string; applicationKey: string; secret: string }): Promise<Signing> };
const signing = await openCoreClientSigning({ keyFile: process.env.SEMA_RESOURCE_KEY_FILE ?? join(process.cwd(), 'keys', process.platform === 'win32' ? 'resource-key.dpapi' : 'resource-key.pem'), coreUrl: core, applicationKey, secret });
console.log(`Signing with Resource's key ${signing.keyId}.`);

async function register(capabilityKey: string, displayName: string, endpointPath: string) {
  const body = Buffer.from(JSON.stringify({ capabilityKey, displayName, description: 'Policy-controlled Foundation resource facility.', providerKey: 'sema.foundation.resource-facility', version: '1.0.0', metadata: { endpointUrl: `${facility}${endpointPath}`, contractVersion: '1.0.0', localFirst: true, referenceOnly: true, policyControlled: true } }));
  const response = await signing.fetch('POST', new URL(`${core}/v1/core/runtime/capabilities`), body, { 'content-type': 'application/json' });
  if (!response.ok) throw new Error(`Core refused to register ${capabilityKey} (${response.status}): ${await response.text()}`);
}
await register(RESOURCE_CATALOG_CAPABILITY, 'Discover Shared Resources', '/v1/resources/catalog');
await register(RESOURCE_DELIVERY_CAPABILITY, 'Deliver Shared Resource Content', '/v1/resources');
console.log('SEMA Foundation Resource registered with Core.');
