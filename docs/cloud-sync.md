# Cloud sync protocol foundation

WealthFlow remains local-first. Manual JSON backup/restore stays supported even after cloud sync is introduced.

This document defines the first implementation slice for future synchronization. It deliberately does **not** connect to a cloud provider, store credentials, or automatically replace local financial data.

## Safety goals

Cloud sync must preserve the same trust guarantees as local persistence:

- never silently overwrite divergent financial histories,
- validate downloaded metadata before any destructive action,
- keep API credentials and provider tokens out of portable financial backups,
- retain manual JSON backup/restore as an independent recovery path,
- fail closed when ancestry cannot be proven,
- keep sync transport separate from database restore/apply logic.

## Protocol v1 manifest

Each synchronized snapshot has a small manifest:

- `protocolVersion`
- `deviceId`
- `revision`
- `snapshotHash` — SHA-256 of the serialized snapshot payload
- `parentHash` — hash of the immediately preceding snapshot, or `null` at revision 0
- `createdAt`

The current implementation is transport-neutral in `src/main/sync-protocol.js`.

## Conservative decision rules

Given validated local and remote manifests:

1. Same snapshot hash → `same`
2. Remote revision is exactly local + 1 and points to the local hash → `download`
3. Local revision is exactly remote + 1 and points to the remote hash → `upload`
4. Anything else → `conflict`

The protocol intentionally does not infer ancestry across revision gaps. That avoids turning a stale or divergent device into an automatic overwrite.

## What this PR does not do

- no cloud account sign-in
- no provider choice
- no network transport
- no automatic background sync
- no encryption/key-management implementation
- no merge of conflicting financial rows
- no UI claiming sync is available

Those should be separate slices after the protocol and threat model are reviewed.

## Next implementation slice

The next safe step is a local sync journal that records committed snapshot lineage and produces a candidate upload package without sending it anywhere. That slice should include crash/retry semantics and tests proving that a failed sync attempt cannot mutate or lose local financial data.
