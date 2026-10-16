import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { AuthStore } from './auth-store.js';
import { AccessStore } from './store.js';
import { CoreClient, type CoreRequestSigner } from './core-client.js';
import { createAccessServer } from './server.js';

const port = Number(process.env.SEMA_FOUNDATION_ACCESS_PORT ?? '4340');
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('SEMA_FOUNDATION_ACCESS_PORT must be a valid port');
const adminKey = process.env.SEMA_FOUNDATION_ACCESS_ADMIN_KEY;
const bootstrapKey = process.env.SEMA_FOUNDATION_ACCESS_BOOTSTRAP_KEY;
const policyKey = process.env.SEMA_POLICY_KEY ?? process.env.SEMA_FOUNDATION_ACCESS_POLICY_KEY;
const coreApplicationKey = process.env.SEMA_APPLICATION_KEY ?? process.env.SEMA_FOUNDATION_ACCESS_CORE_APPLICATION_KEY ?? 'sema.foundation.access';
const coreApplicationSecret = process.env.SEMA_APPLICATION_SECRET ?? process.env.SEMA_FOUNDATION_ACCESS_CORE_APPLICATION_SECRET;
const sessionKey = process.env.SEMA_AUTH_SESSION_KEY;
const sessionTtlMinutes = Number(process.env.SEMA_AUTH_SESSION_TTL_MINUTES ?? '480');
if (!adminKey || !bootstrapKey || !policyKey) throw new Error('SEMA_FOUNDATION_ACCESS_ADMIN_KEY, SEMA_FOUNDATION_ACCESS_BOOTSTRAP_KEY, and SEMA_POLICY_KEY are required');
if (!sessionKey || Buffer.byteLength(sessionKey, 'utf8') < 32) throw new Error('SEMA_AUTH_SESSION_KEY must be a unique secret of at least 32 bytes');
if (!Number.isSafeInteger(sessionTtlMinutes) || sessionTtlMinutes < 15 || sessionTtlMinutes > 43_200) throw new Error('SEMA_AUTH_SESSION_TTL_MINUTES must be between 15 and 43200');
if (!coreApplicationSecret) console.warn('Foundation Access is in Core credential transition mode. Configure its Core application secret before enabling Foundation policy in Core.');
const dataDirectory = resolve(process.env.SEMA_FOUNDATION_ACCESS_DATA_DIR ?? './data');
const store = new AccessStore(dataDirectory);
const authStore = new AuthStore(dataDirectory);
await store.initialize();
await authStore.initialize();
const coreUrl = (process.env.SEMA_CORE_URL ?? 'http://127.0.0.1:4310').replace(/\/$/, '');
// Access signs its requests to Core with its own key (RFC 9421), using Core's shared client code from Core's folder:
// SEMA_CORE_DIRECTORY, or SEMA-Core beside the SEMA-Foundation folder. Its key file (SEMA_FOUNDATION_ACCESS_KEY_FILE)
// is made on the first start and must never be committed or copied. Without them it uses its key and secret.
let signer: CoreRequestSigner | undefined;
if (coreApplicationSecret) {
  const coreDirectory = resolve(process.env.SEMA_CORE_DIRECTORY ?? join(process.cwd(), '..', '..', 'SEMA-Core'));
  try {
    const { openCoreClientSigning } = await import(pathToFileURL(join(coreDirectory, 'dist', 'keys', 'client-signing.js')).href) as { openCoreClientSigning(input: { keyFile: string; coreUrl: string; applicationKey: string; secret: string }): Promise<CoreRequestSigner & { register(): Promise<void> }> };
    const signing = await openCoreClientSigning({ keyFile: process.env.SEMA_FOUNDATION_ACCESS_KEY_FILE ?? join(process.cwd(), 'keys', process.platform === 'win32' ? 'access-key.dpapi' : 'access-key.pem'), coreUrl, applicationKey: coreApplicationKey, secret: coreApplicationSecret });
    signer = signing;
    console.log(`Foundation Access signs its requests to Core with key ${signing.keyId}.`);
    await signing.register().catch((error: unknown) => console.warn(`${error instanceof Error ? error.message : error}. It will try again on the first request.`));
  } catch (error) {
    console.warn(`Foundation Access cannot sign its requests to Core, so it uses its key and secret: ${error instanceof Error ? error.message : error}`);
  }
}
const version = (JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }).version;
const server = createAccessServer({ store, authStore, core: new CoreClient(coreUrl, coreApplicationKey, coreApplicationSecret, signer), adminKey, bootstrapKey, policyKey, sessionKey, sessionTtlMinutes });
await new Promise<void>((resolveListen, reject) => { server.once('error', reject); server.listen(port, process.env.SEMA_FOUNDATION_ACCESS_HOSTNAME ?? '127.0.0.1', () => { server.off('error', reject); resolveListen(); }); });
console.log(`SEMA Foundation Access v${version} listening on http://${process.env.SEMA_FOUNDATION_ACCESS_HOSTNAME ?? '127.0.0.1'}:${port}`);
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => server.close(() => process.exit(0)));
