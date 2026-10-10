import { createHmac, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { AuthSession, AuthState, User, UserCredential, Workspace } from './contracts.js';

const scrypt = promisify(scryptCallback);
const tokenVersion = 'sema-auth-v1';
const keyLength = 64;

type TokenPayload = { sessionId: string; userId: string; workspaceId?: string; issuedAt: string; expiresAt: string };
export type AuthenticatedSession = { session: AuthSession; userId: string; workspaceId?: string };

export const normalizeEmail = (value: string) => {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('email must be a valid email address');
  return email;
};

export const validatePassword = (value: string) => {
  if (value.length < 12) throw new Error('password must be at least 12 characters');
  if (Buffer.byteLength(value, 'utf8') > 1024) throw new Error('password is too long');
  return value;
};

export async function createCredential(userId: string, email: string, password: string): Promise<UserCredential> {
  const passwordSalt = randomBytes(16).toString('base64url');
  const passwordHash = Buffer.from(await scrypt(validatePassword(password), passwordSalt, keyLength) as Buffer).toString('base64url');
  return { userId, emailNormalized: normalizeEmail(email), passwordHash, passwordSalt, passwordChangedAt: new Date().toISOString(), failedLoginCount: 0 };
}

export async function verifyPassword(credential: UserCredential, password: string) {
  const actual = Buffer.from(credential.passwordHash, 'base64url');
  const candidate = Buffer.from(await scrypt(password, credential.passwordSalt, keyLength) as Buffer);
  return actual.length === candidate.length && timingSafeEqual(actual, candidate);
}

function encode(value: unknown) { return Buffer.from(JSON.stringify(value)).toString('base64url'); }
function decode(value: string) { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as TokenPayload; }
function signature(value: string, key: string) { return createHmac('sha256', key).update(value).digest('base64url'); }

export function issueSession(input: { userId: string; workspaceId?: string; ttlMinutes: number; signingKey: string }) {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + input.ttlMinutes * 60_000);
  const session: AuthSession = { id: randomUUID(), userId: input.userId, workspaceId: input.workspaceId, issuedAt: issuedAt.toISOString(), expiresAt: expiresAt.toISOString() };
  const payload: TokenPayload = { sessionId: session.id, userId: session.userId, workspaceId: session.workspaceId, issuedAt: session.issuedAt, expiresAt: session.expiresAt };
  const encoded = encode(payload);
  return { session, accessToken: `${tokenVersion}.${encoded}.${signature(`${tokenVersion}.${encoded}`, input.signingKey)}` };
}

export function bearerToken(header: string | undefined) {
  const match = /^Bearer\s+(.+)$/i.exec(header ?? '');
  if (!match) throw new Error('A bearer session token is required.');
  return match[1];
}

export function authenticateToken(token: string, state: AuthState, signingKey: string): AuthenticatedSession {
  const [version, encoded, suppliedSignature, ...rest] = token.split('.');
  if (version !== tokenVersion || !encoded || !suppliedSignature || rest.length) throw new Error('Session token is invalid.');
  const expectedSignature = signature(`${version}.${encoded}`, signingKey);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error('Session token is invalid.');
  const payload = decode(encoded);
  if (!payload.sessionId || !payload.userId || Date.parse(payload.expiresAt) <= Date.now()) throw new Error('Session token is expired.');
  const session = state.sessions.find((candidate) => candidate.id === payload.sessionId && candidate.userId === payload.userId);
  if (!session || session.revokedAt || Date.parse(session.expiresAt) <= Date.now()) throw new Error('Session is no longer active.');
  return { session, userId: session.userId, workspaceId: session.workspaceId };
}

export function workspacesForUser(input: { user: User; workspaces: Workspace[]; memberships: Array<{ userId: string; organizationId: string; workspaceId?: string; status: string }> }) {
  const memberships = input.memberships.filter((membership) => membership.userId === input.user.id && membership.status === 'ACTIVE');
  return input.workspaces.filter((workspace) => memberships.some((membership) => membership.workspaceId === workspace.id || (!membership.workspaceId && membership.organizationId === workspace.organizationId)));
}
