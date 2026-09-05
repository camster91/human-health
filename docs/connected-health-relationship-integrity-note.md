# Connected-health observation/source relationship integrity

Current release control: issue #82. Active hardening: PR #102.

Connected-health rows are not trusted merely because each observation and source row is structurally valid by itself. Human Health also validates the relationships between them before connected data can be treated as complete export, coaching, clinician-export, or integration evidence.

Required relationship invariants:

- source IDs are unique
- canonical observation IDs are unique
- every observation references an existing source
- an observation's provenance provider matches its source provider
- an observation metric is declared in the source's supported metrics
- retained historical observations do not require the metric to remain currently granted after disconnect/revocation

A relationship-integrity failure is a data-integrity error, not an invitation to guess or silently discard data. Connected-health-derived outputs are withheld until the source metadata is repaired/replaced or the affected local data is explicitly deleted.

During recoverable streamed imports, a source may be temporarily incomplete while batches are being written. User-facing snapshots/exports must fail closed during that intermediate state; successful source-summary persistence clears the relationship error on the next connected-health refresh. If the import fails, the existing recoverable import path restores the touched source state.

This source rule still requires executable/browser IndexedDB verification under #82/#61 before release readiness can be claimed.
