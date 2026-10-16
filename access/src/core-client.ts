/** Signs requests to Core with Access's own key (Core's shared client code, loaded from Core's folder). */
export interface CoreRequestSigner { keyId: string; fetch(method: string, url: URL, body?: Buffer, headers?: Record<string, string>): Promise<Response> }

/**
 * Access never invents permanent SEMA identifiers. Core is the sole issuer. Requests to Core are signed with Access's
 * own key when it has one (RFC 9421); otherwise they carry its key and secret, until every program signs.
 */
export class CoreClient {
  constructor(private readonly url: string, private readonly applicationKey?: string, private readonly applicationSecret?: string, private readonly signer?: CoreRequestSigner) {}
  private headers() { return { 'content-type': 'application/json', ...(this.applicationKey && this.applicationSecret ? { 'x-sema-application-key': this.applicationKey, 'x-sema-application-secret': this.applicationSecret } : {}) }; }
  private post(path: string, payload: unknown) {
    const body = Buffer.from(JSON.stringify(payload));
    if (this.signer) return this.signer.fetch('POST', new URL(`${this.url}${path}`), body, { 'content-type': 'application/json' });
    return fetch(`${this.url}${path}`, { method: 'POST', headers: this.headers(), body });
  }
  /** How this client proves itself to Core, for the health report. */
  get proof() { return this.signer ? 'signed' : this.applicationSecret ? 'key and secret' : 'none'; }
  async issue(typeCode: string, metadata: Record<string, unknown> = {}) {
    const reserve = await this.post('/v1/core/identifiers/reservations', { count: 1, typeCode, metadata });
    if (!reserve.ok) throw new Error(`Core identifier reservation failed (${reserve.status}): ${await reserve.text()}`);
    const reservation = await reserve.json() as { reservation: { id: string }; identifiers: Array<{ id: string }> };
    const id = reservation.identifiers[0]?.id; if (!id) throw new Error('Core returned no identifier');
    const consume = await this.post('/v1/core/identifiers/consume', { reservationId: reservation.reservation.id, id, metadata });
    if (!consume.ok) throw new Error(`Core identifier consumption failed (${consume.status}): ${await consume.text()}`);
    return id;
  }
  async audit(action: string, subjectIds: string[], evidence: Record<string, unknown> = {}) {
    const response = await this.post('/v1/core/runtime/audits', { action, subjectIds, evidence });
    if (!response.ok) throw new Error(`Core audit failed (${response.status}): ${await response.text()}`);
  }
}
