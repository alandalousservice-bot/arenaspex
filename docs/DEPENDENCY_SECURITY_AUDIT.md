# ArenaSPEX dependency security audit — 2026-10-08

Baseline: main, c8d8080aa9ddf9b8fe2815dc4cbb3a5f130f77d4.

The initial worktree contained 6 modified tracked files and 19 untracked status entries. Existing Neon dependencies, their locked versions, skill changes, reference PDFs and temporary project work were preserved. The release manifest/lock are reviewed independently of those unrelated Neon additions. No reset, clean, restore, stash, force fix or history rewrite was used.

## Exact initial audit

- Full released lock and working lock: **3 critical, 12 high, 6 moderate, 0 low (21 affected-package flags)**.
- Production-only released lock and working lock: **1 critical, 6 high, 3 moderate, 0 low (10)**, reproducing Render's count.
- The npm count includes inherited parent flags, not 21 independent exploit primitives. Installed modules initially differed from the lock in several patched transitive versions; the release lock, not those accidental installed versions, determines deployment.

## Classification

A = production reachable/security relevant; B = production dependency with advisory prerequisites not currently met; C = build/development/test only. No advisory is suppressed or dismissed as a false positive. Major maintenance changes are explicitly analyzed and regression-tested.

| Package / initial locked version | Severity | Direct / transitive; lock scope | Dependency path | Advisory | Exact vulnerable aggregate range | ArenaSPEX reachability / class | Fixed version / remediation |
|---|---|---|---|---|---|---|---|
| @prisma/config 6.19.3 | high | transitive; production-installed | prisma → @prisma/config → deepmerge-ts | [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) | 6.13.0-dev.1 - 8.1.0-dev.4 | **B** — Trusted local configuration loader; not an HTTP request parser. | Scoped deepmerge-ts 8.0.0 override; Prisma stays 6.19.3. |
| @vitest/mocker 2.1.9 | moderate | transitive; dev-only | vitest → @vitest/mocker | [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9)<br>[GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9)<br>[GHSA-v6wh-96g9-6wx3](https://github.com/advisories/GHSA-v6wh-96g9-6wx3)<br>[GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff)<br>[GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) | <=4.1.10 | **C** — Test-only redirect/mock handling. No UI/browser/API test server configured. | Vitest 4.1.11, fixed mocker 4.1.11. |
| body-parser 1.20.6 | moderate | transitive; production-installed | express → body-parser → qs | [GHSA-x5fp-wj9c-mxmx](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx)<br>[GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g) | 1.20.5 - 1.20.6 | **B** — Only express.json is configured; the affected qs comma/stringify paths are not used. | 1.20.8 / qs 6.16.0 within existing compatible ranges. |
| brace-expansion 5.0.9, 1.1.18 | high | transitive; dev-only | eslint → minimatch; typescript-eslint → typescript-estree → minimatch | [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr)<br>[GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7)<br>[GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) | <=1.1.20 \|\| 4.0.0 - 5.0.11 | **C** — Repository lint/glob patterns only; no HTTP-controlled expansion. | Patch branches to 1.1.21 and 5.0.12. |
| braces 3.0.3 | high | transitive; dev-only | lint-staged → micromatch → braces | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | * | **C** — Git-hook glob tooling only. | No patched braces release; remove this chain by lint-staged 17.0.0. |
| deepmerge-ts 7.1.5 | high | transitive; production-installed | prisma → @prisma/config → deepmerge-ts | [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) | <8.0.0 | **B** — Trusted Prisma configuration only; no request-controlled cyclic object graphs. | 7.1.5 → 8.0.0, scoped to @prisma/config. |
| esbuild 0.21.5 | moderate | transitive; dev-only | vitest / vite-node → vite 5 → esbuild 0.21.5 | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) | <=0.24.2 | **C** — Affected development-server CORS handler is test tooling, not the Express production server. | Remove old nested copies; existing root esbuild 0.25.12 remains. Fixed minimum 0.25.0. |
| express 4.22.2 | moderate | direct; production-installed | express → qs | [GHSA-x5fp-wj9c-mxmx](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx)<br>[GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g) | 4.22.2 | **B** — Inherited qs finding; HTTP query parsing is used, but no comma option or parse/stringify round-trip. | Compatible Express 4.22.3 patch and qs 6.16.0. |
| js-yaml 4.3.1 | high | transitive; dev-only | eslint → @eslint/eslintrc → js-yaml | [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) | 4.0.0 - 4.3.1 | **C** — Lint configuration parser only; no uploaded YAML parser in product code. | 4.3.1 → 4.3.2 patch. |
| lint-staged 15.5.2 | high | direct; dev-only | lint-staged → micromatch → braces | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | 7.0.0 - 16.3.4 | **C** — Git hook only; no production runtime. | 15.5.2 → 17.0.0 removes micromatch/braces; Node >=22.22.1. |
| micromatch 4.0.8 | high | transitive; dev-only | lint-staged → micromatch → braces | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | >=0.2.0 | **C** — Git-hook glob parser only. | Remove affected chain through lint-staged 17.0.0. |
| nanoid 3.3.16 | high | transitive; production-installed | vite / autoprefixer → postcss → nanoid 3 | [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) | <3.3.18 | **C** — CSS token identifiers at build time; no attacker-controlled zero-sized custom generator. docx uses a separate safe major. | 3.3.16 → 3.3.20 patch; fixed minimum 3.3.18. |
| prisma 6.19.3 | high | direct; production-installed | prisma → @prisma/config → deepmerge-ts | [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) | 6.13.0-dev.1 - 8.1.0-dev.4 | **B** — Installed CLI runs safe migrations; affected configuration merger receives trusted local config, not user input. | Keep 6.19.3 / Client 6.19.3; fix only deepmerge-ts. |
| proxy-addr 2.0.7 | critical | transitive; production-installed | express → proxy-addr | [GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) | 1.1.0 - 2.0.7 | **B** — Runtime req.ip is used for rate limits, but trust proxy is numeric 1, not an affected IPv6 trust subnet. | 2.0.7 → 2.0.8 patch. |
| qs 6.15.3 | moderate | transitive; production-installed | express → qs; express → body-parser → qs | [GHSA-x5fp-wj9c-mxmx](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx)<br>[GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g) | 2.2.5 - 6.15.3 | **B** — No comma:true configuration and no qs.stringify round-trip of request data. Default parsing alone does not meet the advisory prerequisites. | 6.15.3 → 6.16.0 minor. |
| source-map-js 1.2.1 | high | transitive; production-installed | @tailwindcss/vite → @tailwindcss/node; vite / autoprefixer → postcss | [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) | 1.0.0 - 1.2.1 | **C** — Build-time CSS source maps; product has no untrusted source-map ingestion endpoint. | 1.2.1 → 1.2.2 patch. |
| tinypool 1.1.1 | critical | transitive; dev-only | vitest → tinypool | [GHSA-5gmw-xhrv-c9v3](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3)<br>[GHSA-85c8-ppgw-ccpr](https://github.com/advisories/GHSA-85c8-ppgw-ccpr) | <=2.1.1 | **C** — Only the old test worker pool; not shipped with npm production install, no application pool.run input. | Patched upstream minimum 2.1.2; remove dependency with Vitest 4.1.11. |
| vite 5.4.21 | high | transitive; dev-only | vitest / vite-node → vite 5.4.21 | [GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9)<br>[GHSA-v6wh-96g9-6wx3](https://github.com/advisories/GHSA-v6wh-96g9-6wx3)<br>[GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff)<br>[GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) | <=6.4.2 | **C** — Affected instances are test development servers. Root Vite 6.4.3 is already beyond the advisory ranges; production serves static output through Express. | Remove nested Vite 5; reuse existing root Vite 6.4.3. |
| vite-node 2.1.9 | moderate | transitive; dev-only | vitest → vite-node → vite 5 | [GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9)<br>[GHSA-v6wh-96g9-6wx3](https://github.com/advisories/GHSA-v6wh-96g9-6wx3)<br>[GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff)<br>[GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) | <=2.2.0-beta.2 | **C** — Old test runner tooling only. | Remove with Vitest 4.1.11. |
| vitest 2.1.9 | critical | direct; dev-only | vitest → @vitest/mocker / tinypool / vite-node | [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9)<br>[GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9)<br>[GHSA-v6wh-96g9-6wx3](https://github.com/advisories/GHSA-v6wh-96g9-6wx3)<br>[GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff)<br>[GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)<br>[GHSA-5xrq-8626-4rwp](https://github.com/advisories/GHSA-5xrq-8626-4rwp)<br>[GHSA-5gmw-xhrv-c9v3](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3)<br>[GHSA-85c8-ppgw-ccpr](https://github.com/advisories/GHSA-85c8-ppgw-ccpr) | <=4.1.10 | **C** — Dev-only. Scripts use vitest run/watch, with no UI, Browser Mode, or exposed api.host. Genuine vulnerable package, not evidence of production RCE. | 2.1.9 → 4.1.11; smallest verified major supporting root Vite 6 and fixing all these advisories. |
| xlsx 0.18.5 | high | direct; production-installed | xlsx (direct) | [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6)<br>[GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9) | * | **A** — Teacher roster import calls XLSX.read on uploaded XLS/XLSX bytes after role, size and signature checks. These checks do not eliminate crafted valid workbooks. | 0.18.5 → official SheetJS CDN 0.20.3 tarball, integrity-locked. Fix thresholds: 0.19.3 (pollution), 0.20.2 (ReDoS). |

## Exact underlying advisory ranges

Parent ranges above are npm metavulnerability aggregates. This table preserves each underlying advisory range, including distinct brace-expansion branches.

| Package | Severity | Advisory | Vulnerable range |
|---|---|---|---|
| @vitest/mocker | moderate | [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) | >=2.1.0 <4.1.11 |
| brace-expansion | moderate | [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) | <1.1.21 |
| brace-expansion | moderate | [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) | >=4.0.0 <5.0.12 |
| brace-expansion | high | [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) | <1.1.20 |
| brace-expansion | high | [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) | >=4.0.0 <5.0.11 |
| brace-expansion | high | [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) | <1.1.19 |
| brace-expansion | high | [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) | >=4.0.0 <5.0.10 |
| braces | high | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | <=3.0.3 |
| deepmerge-ts | high | [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) | <8.0.0 |
| esbuild | moderate | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) | <=0.24.2 |
| js-yaml | high | [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) | >=4.0.0 <4.3.2 |
| nanoid | high | [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) | <3.3.18 |
| proxy-addr | critical | [GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) | >=1.1.0 <2.0.8 |
| qs | moderate | [GHSA-x5fp-wj9c-mxmx](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx) | >=6.14.2 <=6.15.3 |
| qs | moderate | [GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g) | >=2.2.5 <6.16.0 |
| source-map-js | high | [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) | >=1.0.0 <1.2.2 |
| tinypool | critical | [GHSA-5gmw-xhrv-c9v3](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3) | <=2.1.0 |
| tinypool | critical | [GHSA-85c8-ppgw-ccpr](https://github.com/advisories/GHSA-85c8-ppgw-ccpr) | <2.1.2 |
| vite | moderate | [GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9) | <=6.4.1 |
| vite | moderate | [GHSA-v6wh-96g9-6wx3](https://github.com/advisories/GHSA-v6wh-96g9-6wx3) | <=6.4.2 |
| vite | high | [GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) | <=6.4.2 |
| vitest | critical | [GHSA-5xrq-8626-4rwp](https://github.com/advisories/GHSA-5xrq-8626-4rwp) | <3.2.6 |
| vitest | moderate | [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) | >=2.1.0 <4.1.11 |
| xlsx | high | [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) | <0.19.3 |
| xlsx | high | [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9) | <0.20.2 |

## Critical findings

**proxy-addr (CVE-2026-90711)**: the vulnerable path compiles IPv4-mapped/zero-leading IPv6 trust subnets with short prefixes, allowing external IPv4 clients to spoof forwarded addresses. server.ts uses app.set('trust proxy', 1); it does not compile such a subnet. Class B, genuine vulnerable package with the specific exploit prerequisite absent. It is nevertheless patched to 2.0.8. The new regression exercises the advisory subnet and a correctly written /104 subnet.

**Vitest (CVE-2026-47429)**: affected UI/API file serving is not enabled in vitest.config.ts or package scripts. The production npm install omits Vitest. Class C. Fixed UI behavior starts at 3.2.6, but the redirect-mocker finding requires 4.1.11; selecting 4.1.11 also removes the old Vite and tinypool chains.

**tinypool (CVE-2026-104848, CVE-2026-104849)**: the RCE gadgets require polluted worker/run options and an existing prototype-pollution primitive. ArenaSPEX does not instantiate an application tinypool pool; the only dependency is Vitest 2's dev worker implementation. Class C. Patched minimum 2.1.2; the dependency is removed entirely by the supported Vitest 4 worker implementation.

## High findings and compatibility decisions

**SheetJS** is the production-reachable high finding: src/server/apiRouter.ts passes authorized teacher uploads to parseStudentRosterWorkbook; src/services/studentRosterImport.service.ts calls XLSX.read. The existing 2,000,000-character base64 limit and file signatures are useful controls, but do not remove parser reachability. The npm registry has no fixed xlsx release. The [official installation guide](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/) identifies the maintainer CDN 0.20.3 tarball. It preserves the xlsx import/API and XLS/XLSX support; the lock records SHA-512 integrity. Existing workbook/import tests and the added Arabic legacy XLS regression pass. No replacement parser or product change was introduced.

**deepmerge-ts** reaches production-installed Prisma CLI configuration only. Neither a Prisma config file nor an HTTP-controlled merger is present. Prisma's loader imports only deepmerge, passing it trusted plain configuration objects. Version 8 changes default nested Map merging and internal custom-merger types; these usages do not exist in the project's config path. A narrow @prisma/config → deepmerge-ts 8.0.0 override fixes cyclic graph exhaustion without a Prisma/Client major upgrade. This override is justified by the specific advisory and validated by Prisma CLI/schema checks, all eight PostgreSQL gates, and the full production migration/bootstrap/start sequence. The [upstream v8 notes](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0) describe the analyzed behavior changes.

**lint-staged** has no safe braces patch in its old dependency chain. 17.0.0 switches to picomatch/tinyexec and removes micromatch/braces; the existing glob-to-command configuration is supported. Node >=22.22.1 is declared consistently with its engine requirement (validated on local Node 24.19.0; existing Render runtime was Node 26.11.1). The existing pre-commit hook's automatic stash is not used for this release; equivalent explicit lint/type/build/test checks are completed before the dedicated commit. Hook source is unchanged.

**Vitest 4.1.11** is an intentional bounded dev major, not a general dependency refresh. It supports the existing Vite 6.4.3 and removes old nested Vite/esbuild and tinypool. The PostgreSQL wrapper drops the removed minWorkers flag and retains maxWorkers=1, preserving sequential isolation. Mock/auth behavior is checked by the full regression suite. Vitest 5 was not required.

The remaining high build findings (brace-expansion, js-yaml, nanoid and source-map-js) receive compatible branch patches. Their vulnerable paths do not consume production request data. Parent findings disappear because their vulnerable children are corrected, not because advisory metadata was hidden. The qs moderate prerequisites (comma parsing and request-data stringify) are absent, but its compatible 6.16.0 fix and associated Express/body-parser patches are still included.

## Complete dependency diff

All lock entry changes below derive from the named fixes, the two dev-tool major dependency graphs, removal of the old xlsx auxiliary packages (now bundled upstream), or node relocation/deduplication required by those graphs. No unrelated direct dependency is updated.

| Lock entry | Old | New | Reason |
|---|---|---|---|
| node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion | 5.0.9 | 5.0.12 | named security fix |
| node_modules/@vitest/expect | 2.1.9 | 4.1.11 | Vitest security major graph / old worker removal |
| node_modules/@vitest/pretty-format | 2.1.9 | 4.1.11 | Vitest security major graph / old worker removal |
| node_modules/@vitest/runner | 2.1.9 | 4.1.11 | Vitest security major graph / old worker removal |
| node_modules/@vitest/runner/node_modules/pathe | 1.1.2 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/@vitest/snapshot | 2.1.9 | 4.1.11 | Vitest security major graph / old worker removal |
| node_modules/@vitest/snapshot/node_modules/pathe | 1.1.2 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/@vitest/spy | 2.1.9 | 4.1.11 | Vitest security major graph / old worker removal |
| node_modules/@vitest/utils | 2.1.9 | 4.1.11 | Vitest security major graph / old worker removal |
| node_modules/adler-32 | 1.3.1 | removed | old SheetJS auxiliary dependency removal |
| node_modules/ansi-regex | 6.2.2 | 6.4.0 | lint-staged security major graph / relocation or shared metadata |
| node_modules/body-parser | 1.20.6 | 1.20.8 | named security fix |
| node_modules/brace-expansion | 1.1.18 | 1.1.21 | named security fix |
| node_modules/braces | 3.0.3 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/cac | 6.7.14 | removed | Vitest security major graph / old worker removal |
| node_modules/cfb | 1.2.2 | removed | old SheetJS auxiliary dependency removal |
| node_modules/chai | 5.3.3 | 6.3.0 | Vitest security major graph / old worker removal |
| node_modules/check-error | 2.1.3 | removed | Vitest security major graph / old worker removal |
| node_modules/cli-truncate | 4.0.0 | 5.2.0 | lint-staged security major graph / relocation or shared metadata |
| node_modules/codepage | 1.15.0 | removed | old SheetJS auxiliary dependency removal |
| node_modules/colorette | 2.0.20 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/commander | 13.1.0 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/crc-32 | 1.2.2 | removed | old SheetJS auxiliary dependency removal |
| node_modules/deep-eql | 5.0.2 | removed | Vitest security major graph / old worker removal |
| node_modules/deepmerge-ts | 7.1.5 | 8.0.0 | named security fix |
| node_modules/es-module-lexer | 1.7.0 | 2.3.2 | Vitest security major graph / old worker removal |
| node_modules/execa | 8.0.1 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/execa/node_modules/is-stream | 3.0.0 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/express | 4.22.2 | 4.22.3 | named security fix |
| node_modules/fill-range | 7.1.1 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/frac | 1.1.2 | removed | old SheetJS auxiliary dependency removal |
| node_modules/get-east-asian-width | 1.6.0 | 1.7.0 | lint-staged security major graph / relocation or shared metadata |
| node_modules/get-stream | 8.0.1 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/human-signals | 5.0.0 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/is-fullwidth-code-point | 4.0.0 | 5.1.0 | lint-staged security major graph / relocation or shared metadata |
| node_modules/is-number | 7.0.0 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/js-yaml | 4.3.1 | 4.3.2 | named security fix |
| node_modules/lilconfig | 3.1.3 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/lint-staged | 15.5.2 | 17.0.0 | lint-staged security major graph / relocation or shared metadata |
| node_modules/lint-staged/node_modules/chalk | 5.6.2 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/listr2 | 8.3.3 | 10.2.2 | lint-staged security major graph / relocation or shared metadata |
| node_modules/log-update/node_modules/is-fullwidth-code-point | 5.1.0 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/loupe | 3.2.1 | removed | Vitest security major graph / old worker removal |
| node_modules/merge-stream | 2.0.0 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/micromatch | 4.0.8 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/micromatch/node_modules/picomatch | 2.3.2 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/mimic-fn | 4.0.0 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/nanoid | 3.3.16 | 3.3.20 | named security fix |
| node_modules/npm-run-path | 5.3.0 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/npm-run-path/node_modules/path-key | 4.0.0 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/onetime | 6.0.0 | 7.0.0 | lint-staged security major graph / relocation or shared metadata |
| node_modules/pathval | 2.0.1 | removed | Vitest security major graph / old worker removal |
| node_modules/pidtree | 0.6.1 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/proxy-addr | 2.0.7 | 2.0.8 | named security fix |
| node_modules/qs | 6.15.3 | 6.16.0 | named security fix |
| node_modules/restore-cursor/node_modules/onetime | 7.0.0 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/slice-ansi | 5.0.0 | 8.0.0 | lint-staged security major graph / relocation or shared metadata |
| node_modules/source-map-js | 1.2.1 | 1.2.2 | named security fix |
| node_modules/ssf | 0.11.2 | removed | old SheetJS auxiliary dependency removal |
| node_modules/std-env | 3.10.0 | 4.3.0 | Vitest security major graph / old worker removal |
| node_modules/string-width | 7.2.0 | 8.3.0 | lint-staged security major graph / relocation or shared metadata |
| node_modules/strip-final-newline | 3.0.0 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/tinypool | 1.1.1 | removed | Vitest security major graph / old worker removal |
| node_modules/tinyrainbow | 1.2.0 | 3.2.0 | Vitest security major graph / old worker removal |
| node_modules/tinyspy | 3.0.2 | removed | Vitest security major graph / old worker removal |
| node_modules/to-regex-range | 5.0.1 | removed | lint-staged security major graph / relocation or shared metadata |
| node_modules/vite-node | 2.1.9 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/aix-ppc64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/android-arm | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/android-arm64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/android-x64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/darwin-arm64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/darwin-x64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/freebsd-arm64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/freebsd-x64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/linux-arm | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/linux-arm64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/linux-ia32 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/linux-loong64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/linux-mips64el | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/linux-ppc64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/linux-riscv64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/linux-s390x | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/linux-x64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/netbsd-x64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/openbsd-x64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/sunos-x64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/win32-arm64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/win32-ia32 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/@esbuild/win32-x64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/esbuild | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/pathe | 1.1.2 | removed | Vitest security major graph / old worker removal |
| node_modules/vite-node/node_modules/vite | 5.4.21 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest | 2.1.9 | 4.1.11 | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/aix-ppc64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/android-arm | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/android-arm64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/android-x64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/darwin-arm64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/darwin-x64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/freebsd-arm64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/freebsd-x64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/linux-arm | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/linux-arm64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/linux-ia32 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/linux-loong64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/linux-mips64el | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/linux-ppc64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/linux-riscv64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/linux-s390x | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/linux-x64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/netbsd-x64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/openbsd-x64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/sunos-x64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/win32-arm64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/win32-ia32 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@esbuild/win32-x64 | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/@vitest/mocker | 2.1.9 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/esbuild | 0.21.5 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/pathe | 1.1.2 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/tinyexec | 0.3.2 | removed | Vitest security major graph / old worker removal |
| node_modules/vitest/node_modules/vite | 5.4.21 | removed | Vitest security major graph / old worker removal |
| node_modules/wmf | 1.0.2 | removed | old SheetJS auxiliary dependency removal |
| node_modules/word | 0.3.0 | removed | old SheetJS auxiliary dependency removal |
| node_modules/wrap-ansi | 9.0.2 | 10.0.2 | lint-staged security major graph / relocation or shared metadata |
| node_modules/xlsx | 0.18.5 | 0.20.3 | named security fix |
| node_modules/yaml | 2.9.0 | 2.9.0 | lint-staged security major graph / relocation or shared metadata |
| node_modules/@types/chai | absent | 5.2.3 | Vitest security major graph / old worker removal |
| node_modules/@types/deep-eql | absent | 4.0.2 | Vitest security major graph / old worker removal |
| node_modules/@vitest/mocker | absent | 4.1.11 | Vitest security major graph / old worker removal |
| node_modules/log-update/node_modules/string-width | absent | 7.2.0 | lint-staged security major graph / relocation or shared metadata |
| node_modules/log-update/node_modules/wrap-ansi | absent | 9.0.2 | lint-staged security major graph / relocation or shared metadata |
| node_modules/obug | absent | 2.2.1 | Vitest security major graph / old worker removal |

## Validation before release

- Focused actual-library exploits, spreadsheet import, auth/session/authorization/Audit tests: 138 PASS.
- PostgreSQL: eight directory-verified local disposable gates, 122 PASS (Audit, Card, Transfer, Integrity, Visits, Reports, Weekly and Safe Release).
- Full suite: 1671 PASS, the exact same six accepted pre-existing assertion failures, 143 pending/skipped; no new assertion failure. The pre-existing opt-in remote Teacher ownership harness remains unexecuted/failed its guard, per the prohibition on remote DB tests. Local PostgreSQL gates cover self/foreign ownership and cross-role denials.
- Prisma validate, typecheck, lint and source production build: PASS; lint retains 0 errors / 439 existing warnings.
- npm run render:build tested both with dev dependencies and production-only install in an isolated source copy. Windows engine reuse was version/hash-verified for the unchanged Prisma 6.19.3 engines; no database is touched by generation. Source production build is additionally run from D:/arenaspex.
- Production-mode render:start is checked on a new directory-verified local PostgreSQL cluster: all 38 migrations, synthetic Admin creation, unchanged repeated bootstrap, successful startup/health and synthetic Admin login. General db:seed is absent from build/start.
- Final full and production-only npm audits: 0 critical, 0 high, 0 moderate, 0 low. No advisory suppression or arbitrary blanket override.
- No production/remote database is used by tests. Only the established safe migration/ENV-bootstrap mechanism may run during the authorized Render release.

Source compatibility change: one obsolete Vitest CLI flag removed from the disposable PostgreSQL wrapper. No application source, schema, migration, access-control, or educational feature changes. The four added test cases cover actual fixed library behavior and XLS compatibility.
