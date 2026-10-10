import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ResourceGrant, ResourceIndex, ResourceRecord } from './contracts.js';

export class ResourceStore {
  private readonly indexPath: string;
  private readonly blobDir: string;
  constructor(private readonly root: string) { this.indexPath = join(root, 'resource-index.json'); this.blobDir = join(root, 'blobs'); }
  async initialize() { await mkdir(this.blobDir, { recursive: true }); try { await readFile(this.indexPath); } catch { await this.save({ version: 1, resources: [], grants: [] }); } }
  async load(): Promise<ResourceIndex> { return JSON.parse(await readFile(this.indexPath, 'utf8')) as ResourceIndex; }
  async save(index: ResourceIndex) { const temporary = `${this.indexPath}.${randomUUID()}.tmp`; await writeFile(temporary, JSON.stringify(index, null, 2)); await rename(temporary, this.indexPath); }
  async publish(input: Omit<ResourceRecord, 'byteLength' | 'sha256' | 'publishedAt'>, content: Buffer) {
    const index = await this.load();
    const sha256 = createHash('sha256').update(content).digest('hex');
    const resource: ResourceRecord = { ...input, byteLength: content.byteLength, sha256, publishedAt: new Date().toISOString() };
    const filename = `${resource.resourceVersionId}-${sha256}`;
    await writeFile(join(this.blobDir, filename), content, { flag: 'wx' }).catch(async error => { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; });
    index.resources = index.resources.filter(candidate => candidate.resourceVersionId !== resource.resourceVersionId);
    index.resources.push(resource); await this.save(index); return resource;
  }
  async content(resource: ResourceRecord) { return readFile(join(this.blobDir, `${resource.resourceVersionId}-${resource.sha256}`)); }
  async addGrant(grant: Omit<ResourceGrant, 'grantId'>) { const index = await this.load(); const saved = { ...grant, grantId: randomUUID() }; index.grants.push(saved); await this.save(index); return saved; }
}
