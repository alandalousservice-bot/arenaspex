# ArenaSPEX Knowledge Core P2A.2F Release-Scoped Approval Hotfix

## Root cause

The runtime previously used the approved v1.5 singleton whenever no test-specific approval was
injected. The separately approved v1.5.1 record therefore existed but could not be selected by
production runtime configuration. Requesting v1.5.1 would fail closed with
`PRODUCT_APPROVAL_REQUIRED`.

## Release-scoped invariant

Approval is now resolved only after the requested release is known and only by an exact release ID.
The registry requires exactly one matching record. Missing or duplicate records return no approval;
there is no default, latest-version, version-family, fuzzy, or inherited fallback.

The approved decisions themselves are unchanged:

- `knowledge-core:v1.5-combined-2023` retains its original approval record.
- `knowledge-core:v1.5.1-source-fidelity-2023` retains its independent P2A.2D approval record.

An approval for either release cannot authorize the other release.

## Fail-closed behavior

- Known validated release without approval: `PRODUCT_APPROVAL_REQUIRED`
- Unknown release: `UNKNOWN_RELEASE`
- Invalid mode: `INVALID_MODE`
- Duplicate approval records: no approval is returned

The runtime evaluates mode, release existence, release validation, exact release approval, and only
then candidate authority.

## Production isolation and rollback

This sprint does not change Render, production environment variables, release content, Teacher data,
Prisma, migrations, or P1E. The current v1.5 production configuration remains valid. A normal
auto-deploy continues selecting v1.5 because production configuration is unchanged.

Rollback implications are unchanged: select v1.5 explicitly or use legacy mode. No database work or
Teacher-data rewrite is required.
