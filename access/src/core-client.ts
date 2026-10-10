/** Access never invents permanent SEMA identifiers. Core is the sole issuer. */
export class CoreClient {
  constructor(private readonly url: string, private readonly applicationKey?: string, private readonly applicationSecret?: string) {}
  private headers() { return { 'content-type': 'application/json', ...(this.applicationKey && this.applicationSecret ? { 'x-sema-application-key': this.applicationKey, 'x-sema-application-secret': this.applicationSecret } : {}) }; }
  async issue(typeCode: string, metadata: Record<string, unknown> = {}) {
    const reserve = await fetch(`${this.url}/v1/core/identifiers/reservations`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ count: 1, typeCode, metadata }) });
    if (!reserve.ok) throw new Error(`Core identifier reservation failed (${reserve.status}): ${await reserve.text()}`);
    const reservation = await reserve.json() as { reservation: { id: string }; identifiers: Array<{ id: string }> };
    const id = reservation.identifiers[0]?.id; if (!id) throw new Error('Core returned no identifier');
    const consume = await fetch(`${this.url}/v1/core/identifiers/consume`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ reservationId: reservation.reservation.id, id, metadata }) });
    if (!consume.ok) throw new Error(`Core identifier consumption failed (${consume.status}): ${await consume.text()}`);
    return id;
  }
  async audit(action: string, subjectIds: string[], evidence: Record<string, unknown> = {}) {
    const response = await fetch(`${this.url}/v1/core/runtime/audits`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ action, subjectIds, evidence }) });
    if (!response.ok) throw new Error(`Core audit failed (${response.status}): ${await response.text()}`);
  }
}
