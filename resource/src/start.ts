import { createResourceServer } from './server.js';
import { ResourceStore } from './store.js';
const port = Number(process.env.PORT ?? 4330); const host = process.env.HOST ?? '127.0.0.1';
const policyUrl = process.env.SEMA_FOUNDATION_ACCESS_URL; const policyKey = process.env.SEMA_POLICY_KEY;
if (!policyUrl || !policyKey) throw new Error('SEMA_FOUNDATION_ACCESS_URL and SEMA_POLICY_KEY are required for resource policy enforcement.');
const server = await createResourceServer(new ResourceStore(process.env.SEMA_RESOURCE_STORE ?? './data'), process.env.SEMA_RESOURCE_ADMIN_KEY ?? 'replace-this-before-use', { url: policyUrl, key: policyKey });
server.listen(port, host, () => console.log(`SEMA Foundation Resource v0.2.0 listening at http://${host}:${port}`));
