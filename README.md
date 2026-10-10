# SEMA Foundation

Widely used functions shared across SEMA, installed with every installation. See `docs/FOUNDATION_SCOPE.md` and `getFoundationDocumentation()`.

## Layout

This repository is the single Foundation repository. Shared helper functions live in `src/`.
The two Foundation services imported from the local project live in their own folders, each with
its own `package.json`, `.env.example` and tests:

- `access/` - Foundation Access (organizations, workspaces, nodes, applications, access, lifecycle administration).
- `resource/` - Foundation Resource (policy-controlled published-resource catalog and delivery).

They are imported unchanged apart from `.gitignore` files. Overlap with `sema-objects` (`User`, `Organization`,
`Workspace`, `StorageLocation`) is resolved in a later change: the shapes live in `sema-objects`, the behavior stays here.
Never commit `.env`, `data/`, `node_modules/` or archive files.
