# Local sync journal

This is the second cloud-sync foundation slice.

The journal records **only committed local snapshot lineage**. It does not upload anything and does not change database persistence.

## Files

- `sync-journal.json` — bounded local history of snapshot manifests
- `pending-upload.json` — retryable candidate upload package

Both are written with temp-file + fsync + rename semantics.

## Guarantees

- identical snapshots do not create new revisions,
- a new revision points to the immediately prior snapshot hash,
- an upload package can only be prepared from the latest committed snapshot,
- failed or interrupted transport leaves the pending package intact,
- upload acknowledgement must match the exact pending snapshot hash,
- corrupt/tampered pending packages are rejected before use,
- sync metadata failure cannot replace financial database files.

The financial database remains authoritative locally; this journal is synchronization metadata only.
