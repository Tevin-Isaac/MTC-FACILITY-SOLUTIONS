# Data model & design rationale

This platform replaces MTC's previous third-party dispatch tool. The design fixes specific gaps found in a hands-on review of that system (see project memory for the full inventory).

## Core entities

- **Account** — a parent client (e.g. Crash Champions, DriveTime). Has a `type` of `commercial` or `residential`.
- **Site** — a physical location under an account, its own entity (not flattened into generic client records, as the previous system did). A residential account typically has exactly one site.
- **Vendor** — a trade subcontractor, with trades, COI/license expiry, and a rate card. The previous system had no such entity — its "vendor" records were actually parts suppliers.
- **WorkOrder** — the core object. Carries `nte` (Not-to-Exceed, vendor-side) and `dne` (Do-Not-Exceed, client-side) as first-class fields, and a single `status` from one non-duplicated lifecycle.
- **Quote** — supports `optionType: "repair_vs_replace"` for major equipment, per MTC's documented two-option rule, which the previous system's quoting had no structure for.
- **CompletionRecord** — before/after photos and sign-off, required before a work order can move to `ready_to_bill`. This is enforced in application logic, not left as an unconfigured optional gate.
- **Invoice** — generated from an approved quote.

## Why this differs from the previous system

| Prior issue | This platform |
| --- | --- |
| Two parallel pipelines (Work Orders + Jobs) plus duplicate-named tags | One `WorkOrderStatus` enum, no duplication |
| Photo/sign-off/PO gates existed but weren't configured | Completion requires photos + sign-off in code, not an optional setting |
| No NTE/DNE fields on quotes | `nte`/`dne` on `WorkOrder`, both enforced before approval |
| No repair-vs-replace structure | `Quote.optionType` supports it directly |
| Sites flattened into generic client records | `Site` is its own entity under `Account` |
| No vendor/subcontractor directory | `Vendor` entity with trades, COI/license expiry, rate card |
| Commercial-only data model | `Account.type` distinguishes commercial vs residential from day one |

## Status pipeline

See `src/types/work-order.ts` for the full `WorkOrderStatus` type. Unlike the previous system's any-to-any drag between 41 stages, transitions here follow the documented MTC workflow (intake → dispatch → quote/approval → completion → billing), with `on_hold`, `quote_declined`, `complete_no_charge`, and `cancelled` as the exception paths.

## Real intake: ServiceChannel is the source of truth

Most commercial work orders don't originate in this app — they arrive via the **ServiceChannel Contractor Console** (Crash Champions, Big Brand Tire, DriveTime), with Outlook email intake as the fallback for clients not on ServiceChannel. See the `reference_servicechannel_workflow` memory for the full observed flow; it supersedes any earlier guessed intake model. Key implications already reflected in the type system:

- `WorkOrder.source`, `externalTrackingNumber`, and `clientExtendedStatus` carry the ServiceChannel identity and per-client status (e.g. Big Brand's `UNDER REVIEW BY BBTS PM P1–P3`), separately from our own clean `WorkOrderStatus`/phase family — we don't try to force client-specific statuses into our own enum.
- `reporterName`/`reporterCell` are parsed out of ServiceChannel's slash-joined intake description as real contact fields (never shown to vendors), instead of left buried in free text.
- `NteIncrease` / `WorkOrder.nteHistory` models the real approval pattern: verbal NTE increases from the client FM, logged as they happen, before any formal proposal exists.
- `CompletionRecord.rootCause` and `afterVideoUrl` match what MTC actually uploads at close-out.

**Not yet built** (needs Tevin's decision on ServiceChannel API access before starting): two-way ServiceChannel sync (import + push status/notes/proposals/invoices/attachments), Outlook email intake parsing, and the completion-package one-click push to ServiceChannel. Today MTC double-keys every work order between ServiceChannel and the previous system — sync is the single highest-value feature for this platform once credentials are available.
