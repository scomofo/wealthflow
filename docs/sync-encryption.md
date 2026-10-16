# Encrypted sync packages

WealthFlow encrypts a sync package **before** a transport provider receives it.

## Envelope v1

- AES-256-GCM authenticated encryption
- random 96-bit IV per package
- scrypt-derived 256-bit key
- random 128-bit salt per package
- fixed authenticated context string: `wealthflow-sync-envelope-v1`
- encryption passphrase/key is never placed inside the envelope

The cloud transport therefore handles an opaque envelope rather than financial JSON.

## Recovery/key boundary

A cross-device encryption secret must be supplied by the user or a future secure device-pairing flow. Losing that secret means the encrypted cloud copy cannot be decrypted. Manual local JSON backups remain an independent recovery path.

Provider tokens and Anthropic API keys are not part of the encrypted financial package.

## Failure behavior

Wrong keys, modified ciphertext, invalid tags and malformed envelopes fail before any restore operation. Decryption does not mutate the local database.
