# ArenaSPEX Knowledge Core P2A.2D Approval Readiness

## Candidate identity

- Candidate: `knowledge-core:v1.5.1-source-fidelity-2023`
- Review: `knowledge-core-approval:p2a2d:v1.5.1`
- Decision: `APPROVED_FOR_CONTROLLED_ACTIVATION`
- Production activation: not performed
- Current/default release: `knowledge-core:v1.5-combined-2023`

## Source fidelity and semantic coverage

The immutable candidate retains the nine confirmed official corrections, 5 overall competencies,
15 final competencies, 45 competency components, and 55 official resource groups. The expected
resource matrix is G1 `2/1/3`, G2 `5/3/4`, G3 `3/4/3`, G4 `4/6/3`, and G5 `3/7/4`.
All 15 Grade × Domain cells pass source and semantic coverage validation.

## Product review

| Grade | D1 | D2 | D3 |
| --- | --- | --- | --- |
| G1 | APPROVE | APPROVE_WITH_NOTE | APPROVE |
| G2 | APPROVE_WITH_NOTE | APPROVE_WITH_NOTE | APPROVE |
| G3 | APPROVE_WITH_NOTE | APPROVE | APPROVE |
| G4 | APPROVE_WITH_NOTE | APPROVE | APPROVE |
| G5 | APPROVE | APPROVE_WITH_NOTE | APPROVE_WITH_NOTE |

Totals: 8 APPROVE, 7 APPROVE_WITH_NOTE, 0 HOLD, 0 REJECT.

G5/D2 is approved with a compatibility note: its official final competency, three Grade-5
components, and seven resource groups are internally consistent and contain no Grade-3 material.

## Compatibility review

- G1/D2 merge: deterministic supersession to one canonical identity.
- G2/D1 new group: new collision-free canonical identity; no historical guess is needed.
- G2/D2 split: `SPLIT_REQUIRES_REVIEW`; automatic mapping is forbidden.
- G3/D1 supersession: historical identities remain readable; ambiguous mapping fails closed.
- G4/D1 splits: `SPLIT_REQUIRES_REVIEW`; automatic mapping is forbidden.
- G5/D3 split: `SPLIT_REQUIRES_REVIEW`; automatic mapping is forbidden.
- G5/D2 components: three explicit one-to-one supersessions to Grade-5 canonical components.

Teacher-authored text is never rewritten by compatibility resolution.

## Teacher ownership and history

This approval performs no Teacher database writes and does not change Teacher wording, overrides,
objective count/order, integration anchors, snapshots, or executed history. It requires no data
backfill, Prisma change, or migration.

## Activation gates and production isolation

The approval record is independent from v1.5 approval. It does not change the runtime default,
deployment configuration, or environment. Candidate authority is possible only when a later,
explicitly authorized activation supplies candidate mode, the exact v1.5.1 release ID, and this
release-specific approved record. Unknown, invalid, and unapproved selections fail closed.

## Rollback

Rollback is configuration-only: select `knowledge-core:v1.5-combined-2023` or legacy mode. No
database migration, Teacher rewrite, backfill, or Knowledge Core persistence mutation is required.

## Exact activation prerequisites

1. Explicit authorization for a separate production activation sprint.
2. Confirm production is still using v1.5 immediately before activation.
3. Select candidate mode and `knowledge-core:v1.5.1-source-fidelity-2023` together.
4. Deploy and verify the exact commit and structured Knowledge Core runtime diagnostic.
5. Recheck Annual Plan reads, safeguards, errors, and rollback path in production.
