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

/**
 * Export investment transactions to QIF format.
 * @param {Array} investments - Array of investment objects
 * @returns {string} QIF-formatted string
 */
export function exportInvestmentsToQIF(investments) {
  const lines = ['!Type:Invst'];

  for (const inv of investments) {
    if (inv.deleted_at) continue;

    // Date (use current date as purchase date isn't tracked)
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    lines.push(`D${m}/${d}/${now.getFullYear()}`);

    // Action
    lines.push(`NBuy`);

    // Security name
    lines.push(`Y${inv.symbol}`);

    // Price
    lines.push(`I${inv.avg_cost.toFixed(2)}`);

    // Quantity
    lines.push(`Q${inv.shares}`);

    // Total
    lines.push(`T${(inv.shares * inv.avg_cost).toFixed(2)}`);

    // Memo
    if (inv.name) {
      lines.push(`M${inv.name} (${inv.account_type})`);
    }

    lines.push('^');
  }

  return lines.join('\n');
}
