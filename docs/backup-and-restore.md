# WealthFlow backup, restore, and moving computers

WealthFlow stores its database locally on each computer. JSON backup/restore is a manual transfer mechanism; it is **not** cloud synchronization.

## Make a backup on the old computer

1. Open WealthFlow and let it finish loading.
2. Open **Settings → Data Management → Backup (JSON)**.
3. Save the `wealthflow-backup-YYYY-MM-DD.json` file somewhere you control. For a transfer, use a removable drive or a trusted private folder (for example, your own OneDrive folder).
4. Keep at least one untouched copy until the restore has been checked.

The full backup contains database records such as transactions, accounts/investments, bills, budgets, goals, planning/profile data, and settings. The source computer's Anthropic API key is deliberately not exported. The backup contains a masked/configuration hint only; the destination computer keeps its own locally configured key.

## Restore on a new computer

1. Install and launch a compatible WealthFlow version once so it creates its local database and schema.
2. If you have configured an AI API key on the new computer, it remains local during restore. You may need to configure a key separately if you want to use the AI advisor.
3. Open **Settings → Data Management → Restore Backup**.
4. Choose the JSON file you copied from the old computer.
5. Read the replacement warning. Restore replaces the destination's database records; if the new computer already has data you need, export a backup of that computer first.
6. Wait for WealthFlow to report success and reload. Check several records and totals: recent transactions, investments, recurring bills, budgets, and profile settings.

## What does not travel in the JSON backup

- **AI API key:** excluded by design; each device manages its own key.
- **Advisor document files stored outside the database:** the database metadata may be present, but the actual file bytes are not embedded. Copy those files separately if you need them on the destination, and verify their configured storage location before relying on the references.
- **Automatic synchronization:** not provided. Edits made on one computer do not automatically appear on another.

## If the backup file is damaged or rejected

- Invalid JSON, unsupported backup formats, future schema versions, unknown tables/columns, and incomplete same-schema backups should be rejected before replacement begins.
- A database constraint failure during restore should roll back the restore transaction, preserving the destination's previous records.
- If restore reports an error, do not delete the original backup. Re-export a fresh backup from the source computer if possible, then retry with a copy of that file.
- Never edit the JSON by hand to try to repair financial data. Keep the original unchanged and use a fresh export or a known-good copy.

## Safe transfer checklist

- [ ] Source app finished loading before export.
- [ ] JSON file exists and has a plausible non-zero size.
- [ ] Original backup retained unchanged.
- [ ] Destination app version is current enough to read the backup.
- [ ] Destination's current data backed up before replacing it.
- [ ] Restore completed without errors.
- [ ] Spot-checked transactions, balances, bills, budgets, and profile settings.
- [ ] Copied external advisor documents separately if needed.
- [ ] AI key configured locally if the advisor will be used.

For a critical move, keep the source computer and its data untouched until the destination checks are complete.
