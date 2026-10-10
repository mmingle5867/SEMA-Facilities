# SEMA Foundation Resource Facility v0.2.0

This is the policy-controlled boundary for published resources. It stores only explicitly published versions and never accepts private source paths, application databases, or end-user share credentials.

Set a strong `SEMA_RESOURCE_ADMIN_KEY`, start the facility, then run `npm run sema:core:bootstrap`. Application services publish approved bytes with the service credential. Receiving applications use their application key and receive only resources covered by an explicit grant.

This release adds a mandatory Foundation Access policy check before the catalog or resource bytes are returned. Set these values in the Facility `.env`:

```env
SEMA_FOUNDATION_ACCESS_URL="http://127.0.0.1:4340"
SEMA_POLICY_KEY="the-same-policy-key-used-by-Foundation-Access"
```

Both gates must pass: Foundation Access must authorize the application's requested operation, and the Facility must have an unexpired exact resource/version grant. `GET /v1/resources/admin/index` is loopback administration data only and requires `x-sema-admin-key`; it exists for System Console's Resource Access page. It never returns resource bytes.

This local v0.2.0 establishes the contracts and audit boundary. It is intentionally loopback-only; enterprise service identities, signed user sessions, encrypted offline caches, and remote shared-storage adapters will be added through the same policy contract rather than embedded in Forge applications.
