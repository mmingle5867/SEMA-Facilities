import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ResourceGrant, ResourceGroup, ResourceIndex, ResourceRecord } from './contracts.js';

export class ResourceStore {
  private readonly indexPath: string;
  private readonly blobDir: string;
  constructor(private readonly root: string) { this.indexPath = join(root, 'resource-index.json'); this.blobDir = join(root, 'blobs'); }
  async initialize() { await mkdir(this.blobDir, { recursive: true }); try { await readFile(this.indexPath); } catch { await this.save({ version: 1, resources: [], grants: [], groups: [] }); } }
  async load(): Promise<ResourceIndex> { const index = JSON.parse(await readFile(this.indexPath, 'utf8')) as ResourceIndex; index.groups ??= []; return index; }
  async save(index: ResourceIndex) { const temporary = `${this.indexPath}.${randomUUID()}.tmp`; await writeFile(temporary, JSON.stringify(index, null, 2)); await rename(temporary, this.indexPath); }
  async publish(input: Omit<ResourceRecord, 'byteLength' | 'sha256' | 'publishedAt'>, content: Buffer) {
    const index = await this.load();
    if (input.groupId && !index.groups.some((group) => group.groupId === input.groupId)) throw new Error(`Resource group ${input.groupId} does not exist: save the group before publishing into it`);
    const sha256 = createHash('sha256').update(content).digest('hex');
    const resource: ResourceRecord = { ...input, byteLength: content.byteLength, sha256, publishedAt: new Date().toISOString() };
    const filename = `${resource.resourceVersionId}-${sha256}`;
    await writeFile(join(this.blobDir, filename), content, { flag: 'wx' }).catch(async error => { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; });
    index.resources = index.resources.filter(candidate => candidate.resourceVersionId !== resource.resourceVersionId);
    index.resources.push(resource); await this.save(index); return resource;
  }
  async content(resource: ResourceRecord) { return readFile(join(this.blobDir, `${resource.resourceVersionId}-${resource.sha256}`)); }
  /** Saves a group, or replaces it when the same group is shared again. */
  async saveGroup(input: Omit<ResourceGroup, 'updatedAt'>) { const index = await this.load(); const group: ResourceGroup = { ...input, updatedAt: new Date().toISOString() }; index.groups = index.groups.filter((candidate) => candidate.groupId !== group.groupId); index.groups.push(group); await this.save(index); return group; }
  async addGrant(grant: Omit<ResourceGrant, 'grantId'>) { const index = await this.load(); const saved = { ...grant, grantId: randomUUID() }; index.grants.push(saved); await this.save(index); return saved; }
}
