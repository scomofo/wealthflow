// QIF (Quicken Interchange Format) Export for WealthFlow

/**
 * Export transactions to QIF format string.
 * @param {Array} transactions - Array of transaction objects
 * @returns {string} QIF-formatted string
 */
export function exportToQIF(transactions) {
  const lines = ['!Type:Bank'];

  for (const tx of transactions) {
    if (tx.deleted_at) continue;

    // Date in MM/DD/YYYY format
    if (tx.date) {
      const [y, m, d] = tx.date.split('-');
      lines.push(`D${m}/${d}/${y}`);
    }

    // Amount
    lines.push(`T${tx.amount.toFixed(2)}`);

    // Payee/Description
    if (tx.description) {
      lines.push(`P${tx.description}`);
    }

    // Category
    if (tx.category) {
      lines.push(`L${tx.category}`);
    }

    // Notes/Memo
    if (tx.notes) {
      lines.push(`M${tx.notes}`);
    }

    // Record separator
    lines.push('^');
  }

  return lines.join('\n');
}
