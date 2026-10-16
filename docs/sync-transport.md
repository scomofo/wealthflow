# HTTPS cloud sync transport

WealthFlow's first network transport is deliberately provider-neutral: one encrypted JSON object at a configured HTTPS endpoint.

The endpoint can be backed by WebDAV, object storage through a small authenticated gateway, or another service that supports GET/PUT semantics.

## Contract

- GET returns the encrypted sync envelope and an ETag.
- GET 404 means no remote copy exists.
- PUT with `If-None-Match: *` creates the first copy.
- PUT with `If-Match: <etag>` updates a previously read copy.
- HTTP 409/412 is a sync conflict, never an overwrite.
- Redirects are rejected.
- Only HTTPS endpoints are accepted.
- Credentials are supplied as an Authorization header and never embedded in the URL or encrypted financial payload.

This transport does not itself decide whether upload or download is safe. The sync protocol, lineage journal, conflict UI and encryption layer remain separate authorities.
