# Data model & design rationale

This platform replaces JobFlowGo for MTC Facility Solutions. The design fixes specific gaps found in a hands-on review of MTC's live JobFlowGo account (see project memory for the full inventory).

## Core entities

- **Account** — a parent client (e.g. Crash Champions, DriveTime). Has a `type` of `commercial` or `residential`.
- **Site** — a physical location under an account, its own entity (not flattened into "client" records as in JobFlowGo). A residential account typically has exactly one site.
- **Vendor** — a trade subcontractor, with trades, COI/license expiry, and a rate card. JobFlowGo has no such entity; "Vendor Accounts" there means parts suppliers.
- **WorkOrder** — the core object. Carries `nte` (Not-to-Exceed, vendor-side) and `dne` (Do-Not-Exceed, client-side) as first-class fields, and a single `status` from one non-duplicated lifecycle.
- **Quote** — supports `optionType: "repair_vs_replace"` for major equipment, per MTC's documented two-option rule. JobFlowGo's quoting has no such structure.
- **CompletionRecord** — before/after photos and sign-off, required before a work order can move to `ready_to_bill`. This is enforced in application logic, not left as an unconfigured optional gate.
- **Invoice** — generated from an approved quote.

## Why this differs from JobFlowGo

| JobFlowGo issue | This platform |
| --- | --- |
| Two parallel pipelines (Work Orders + Jobs) plus duplicate-named tags | One `WorkOrderStatus` enum, no duplication |
| Photo/sign-off/PO gates exist but aren't configured | Completion requires photos + sign-off in code, not an optional setting |
| No NTE/DNE fields on quotes | `nte`/`dne` on `WorkOrder`, both enforced before approval |
| No repair-vs-replace structure | `Quote.optionType` supports it directly |
| Sites flattened into "client" records | `Site` is its own entity under `Account` |
| No vendor/subcontractor directory | `Vendor` entity with trades, COI/license expiry, rate card |
| Commercial-only data model | `Account.type` distinguishes commercial vs residential from day one |

## Status pipeline

See `src/types/work-order.ts` for the full `WorkOrderStatus` type. Unlike JobFlowGo's any-to-any drag between 41 stages, transitions here follow the documented MTC workflow (intake → dispatch → quote/approval → completion → billing), with `on_hold`, `quote_declined`, `complete_no_charge`, and `cancelled` as the exception paths.
