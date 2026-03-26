// Recurring Payment Detector for WealthFlow
// Analyzes transaction history to find recurring payment patterns

const FREQUENCY_RANGES = [
  { name: 'weekly', min: 5, max: 9, days: 7 },
  { name: 'biweekly', min: 12, max: 17, days: 14 },
  { name: 'monthly', min: 25, max: 36, days: 30 },
  { name: 'quarterly', min: 80, max: 100, days: 91 },
  { name: 'annual', min: 350, max: 380, days: 365 },
];

// Normalize a description for grouping — strip store numbers, trailing codes, whitespace
function normalizeDescription(desc) {
  return desc
    .replace(/#\d+/g, '')           // #411, #29, etc.
    .replace(/\s+_[A-Z]$/i, '')     // trailing _M, _V, _F codes
    .replace(/\s{2,}/g, ' ')        // collapse whitespace
    .replace(/\d{4,}/g, '')         // long number sequences (account numbers)
    .replace(/[A-Z]\d[A-Z]\d[A-Z]\d/g, '') // alphanumeric codes like A2A3Y3
    .trim();
}

// Group transactions by normalized description
function groupTransactions(transactions) {
  const groups = {};
  for (const tx of transactions) {
    if (tx.amount >= 0) continue; // Only expenses
    const key = normalizeDescription(tx.description).toLowerCase();
    if (!key || key.length < 3) continue;
    if (!groups[key]) {
      groups[key] = { description: tx.description, category: tx.category, transactions: [] };
    }
    groups[key].transactions.push(tx);
  }
  return groups;
}

// Detect the frequency of a sorted list of dates
function detectFrequency(dates) {
  if (dates.length < 2) return null;

  const sorted = dates.map(d => new Date(d).getTime()).sort((a, b) => a - b);
  const intervals = [];
  for (let i = 1; i < sorted.length; i++) {
    const days = Math.round((sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24));
    intervals.push(days);
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  for (const freq of FREQUENCY_RANGES) {
    if (avgInterval >= freq.min && avgInterval <= freq.max) {
      // Check consistency — how many intervals fall within range
      const inRange = intervals.filter(d => d >= freq.min && d <= freq.max).length;
      const consistency = inRange / intervals.length;
      if (consistency >= 0.5) {
        return {
          frequency: freq.name,
          avgInterval: Math.round(avgInterval),
          consistency: Math.round(consistency * 100),
          expectedDays: freq.days,
        };
      }
    }
  }

  return null;
}

// Predict the next payment date
function predictNextDate(dates, frequency) {
  const sorted = dates.sort();
  const lastDate = new Date(sorted[sorted.length - 1]);
  const daysMap = { weekly: 7, biweekly: 14, monthly: 0, quarterly: 0, annual: 0 };

  if (frequency === 'monthly') {
    lastDate.setMonth(lastDate.getMonth() + 1);
  } else if (frequency === 'quarterly') {
    lastDate.setMonth(lastDate.getMonth() + 3);
  } else if (frequency === 'annual') {
    lastDate.setFullYear(lastDate.getFullYear() + 1);
  } else {
    lastDate.setDate(lastDate.getDate() + (daysMap[frequency] || 30));
  }

  return lastDate.toISOString().slice(0, 10);
}

/**
 * Detect recurring payments from transaction history
 * @param {Array} transactions - All transactions from state
 * @param {Array} existingBills - Existing bill reminders to avoid duplicates
 * @returns {Array} Detected recurring patterns
 */
export function detectRecurringPayments(transactions, existingBills) {
  const groups = groupTransactions(transactions);
  const results = [];

  // Existing bill titles for dedup (lowercased)
  const existingTitles = new Set(
    (existingBills || []).map(b => normalizeDescription(b.title).toLowerCase())
  );

  for (const [key, group] of Object.entries(groups)) {
    const txs = group.transactions;
    if (txs.length < 3) continue; // Need at least 3 occurrences

    const dates = txs.map(t => t.date);
    const freq = detectFrequency(dates);
    if (!freq) continue;

    const amounts = txs.map(t => Math.abs(t.amount));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const minAmount = Math.min(...amounts);
    const maxAmount = Math.max(...amounts);
    const amountVariance = maxAmount - minAmount;

    // Skip if amounts vary too wildly (>50% of average) — probably not a fixed recurring payment
    // But still allow some variance for things like utilities
    const isFixedAmount = amountVariance / avgAmount < 0.15;
    const isVariableAmount = amountVariance / avgAmount < 0.5;

    if (!isFixedAmount && !isVariableAmount) continue;

    const nextDate = predictNextDate(dates, freq.frequency);
    const alreadyTracked = existingTitles.has(key);

    results.push({
      id: key,
      description: group.description,
      normalizedKey: key,
      category: group.category,
      frequency: freq.frequency,
      avgAmount: Math.round(avgAmount * 100) / 100,
      minAmount,
      maxAmount,
      isFixedAmount,
      occurrences: txs.length,
      consistency: freq.consistency,
      avgInterval: freq.avgInterval,
      nextDate,
      lastDate: dates.sort().pop(),
      alreadyTracked,
    });
  }

  // Sort by confidence (consistency * occurrences) descending
  results.sort((a, b) => {
    if (a.alreadyTracked !== b.alreadyTracked) return a.alreadyTracked ? 1 : -1;
    return (b.consistency * b.occurrences) - (a.consistency * a.occurrences);
  });

  return results;
}
