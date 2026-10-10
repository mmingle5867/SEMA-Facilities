import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { blankAuthState, type AuthState } from './contracts.js';

/**
 * Credential hashes and session records are deliberately separate from the
 * administrative index so ordinary record exports do not include auth data.
 */
export class AuthStore {
  private readonly path: string;
  constructor(root: string) { this.path = join(root, 'auth-secrets.json'); }
  async initialize() { await mkdir(join(this.path, '..'), { recursive: true }); try { await readFile(this.path); } catch { await this.save(blankAuthState()); } }
  async load(): Promise<AuthState> { return JSON.parse(await readFile(this.path, 'utf8')) as AuthState; }
  async save(state: AuthState) { const temporary = `${this.path}.${randomUUID()}.tmp`; await writeFile(temporary, JSON.stringify(state, null, 2), { mode: 0o600 }); await rename(temporary, this.path); }
  async update<T>(fn: (state: AuthState) => T | Promise<T>) { const state = await this.load(); const result = await fn(state); await this.save(state); return result; }
}
