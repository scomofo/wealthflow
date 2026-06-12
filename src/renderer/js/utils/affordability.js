const VALID_FREQUENCIES = new Set(['one_time', 'monthly']);
const VALID_TIMINGS = new Set(['now', 'this_month', 'next_month']);
const BUFFER_WARNING_SHARE = 0.3;
const ADJUSTABLE_BUFFER_WARNING_SHARE = 0.35;
const MONTHS_OF_EXPENSES_FOR_NO = 1;
const MONTHS_OF_EXPENSES_FOR_NOT_YET = 3;

const SUMMARY_BY_VERDICT = {
  yes: 'Yes - this looks affordable.',
  yes_adjust: 'Yes, but adjust your plan first.',
  not_yet: 'Not yet - wait until your buffer improves.',
  no: 'No - this creates too much risk right now.',
  invalid: 'Enter an amount to check affordability.',
};

const DISCLAIMER = 'This is general educational guidance, not financial advice.';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatMoney(value) {
  return `$${Math.round(Math.max(0, value)).toLocaleString('en-CA')}`;
}

function formatSignedMoney(value) {
  const rounded = Math.round(value);
  const absolute = Math.abs(rounded).toLocaleString('en-CA');
  return rounded < 0 ? `-$${absolute}` : `$${absolute}`;
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

export function normalizeAffordabilityPurchase(purchase = {}) {
  const hasAmount =
    purchase.amount !== null &&
    purchase.amount !== undefined &&
    purchase.amount !== '';
  const amount = hasAmount ? Number(purchase.amount) : null;
  const normalizedAmount =
    Number.isFinite(amount) && amount >= 0 ? amount : null;

  const frequency = VALID_FREQUENCIES.has(purchase.frequency)
    ? purchase.frequency
    : 'one_time';
  const timing = VALID_TIMINGS.has(purchase.timing) ? purchase.timing : 'now';

  return {
    name: String(purchase.name || '').trim() || 'this purchase',
    amount: normalizedAmount,
    frequency,
    category: String(purchase.category || '').trim() || 'General',
    timing,
  };
}

function normalizeFinancials(financials = {}) {
  return {
    income: Math.max(0, toNumber(financials.income)),
    expenses: Math.max(0, toNumber(financials.expenses)),
    totalSaved: Math.max(0, toNumber(financials.totalSaved)),
    totalDebt: Math.max(0, toNumber(financials.totalDebt)),
  };
}

function priorityForVerdict(verdict) {
  if (verdict === 'no') return 'high';
  if (verdict === 'yes') return 'low';
  return 'medium';
}

function actionTitle(verdict, purchase) {
  if (verdict === 'yes') {
    return `Buy ${purchase.name} only if planned bills are covered`;
  }
  if (verdict === 'yes_adjust') {
    return `Set aside a buffer before buying ${purchase.name}`;
  }
  if (verdict === 'not_yet') {
    return `Wait until your cash buffer improves before buying ${purchase.name}`;
  }
  return `Do not buy ${purchase.name} until cashflow improves`;
}

function primaryAction(verdict, purchase, metrics) {
  if (verdict === 'invalid') {
    return 'Enter an amount to check affordability.';
  }
  if (verdict === 'yes') {
    return `Buy ${purchase.name} only after planned bills are covered.`;
  }
  if (verdict === 'yes_adjust') {
    return `Adjust your plan before committing ${formatMoney(purchase.amount)}.`;
  }
  if (verdict === 'not_yet') {
    const target =
      purchase.frequency === 'monthly'
        ? metrics.monthlySurplus * 0.5
        : metrics.expenses * 3;
    return `Wait until your safe limit improves to about ${formatMoney(target)}.`;
  }
  return `Do not buy ${purchase.name} until cashflow or savings improve.`;
}

function confidenceForVerdict(verdict) {
  return verdict === 'invalid' ? 'low' : 'medium';
}

function baseWhy(purchase, financials, metrics) {
  if (purchase.frequency === 'monthly') {
    const surplusCopy =
      metrics.monthlySurplus < 0
        ? `negative (${formatSignedMoney(metrics.monthlySurplus)})`
        : formatMoney(metrics.monthlySurplus);

    return [
      `Your estimated monthly surplus is ${surplusCopy}.`,
      `This would use about ${formatPercent(metrics.recurringPressure)} of that surplus.`,
    ];
  }

  return [
    `Your current savings buffer is ${formatMoney(financials.totalSaved)}.`,
    `This would use about ${formatPercent(metrics.bufferPercentage)} of that buffer.`,
  ];
}

function tradeoffsFor(verdict, purchase, metrics) {
  const tradeoffs = [];

  if (purchase.frequency === 'one_time' && verdict !== 'yes') {
    tradeoffs.push('Buying now may slow emergency fund progress.');
  }
  if (purchase.frequency === 'monthly' && verdict !== 'yes') {
    tradeoffs.push('Adding a recurring payment reduces monthly flexibility.');
  }
  if (metrics.debtPressure && verdict !== 'invalid') {
    tradeoffs.push('Existing debt makes extra commitments less flexible.');
  }
  if (purchase.timing === 'next_month' && verdict !== 'invalid') {
    tradeoffs.push('Waiting one month gives you more time to protect cashflow.');
  }

  return tradeoffs;
}

function buildResult(verdict, purchase, financials, metrics, reason) {
  const nextActions =
    verdict === 'invalid'
      ? []
      : [
          {
            title: actionTitle(verdict, purchase),
            type: 'affordability',
            priority: priorityForVerdict(verdict),
            impact:
              verdict === 'yes'
                ? 'Keeps the purchase tied to your plan'
                : 'Protects your cash buffer',
          },
        ];

  return {
    workflow_type: 'affordability_check',
    verdict,
    summary: SUMMARY_BY_VERDICT[verdict],
    recommendation: {
      primary_action: primaryAction(verdict, purchase, metrics),
    },
    why:
      verdict === 'invalid'
        ? ['A positive amount is required before WealthFlow can evaluate risk.']
        : baseWhy(purchase, financials, metrics),
    tradeoffs: tradeoffsFor(verdict, purchase, metrics),
    next_actions: nextActions,
    confidence: confidenceForVerdict(verdict),
    disclaimer: DISCLAIMER,
    _deterministic: true,
    source_payload: {
      purchase,
      financials,
      metrics,
      reason,
    },
  };
}

function evaluateOneTime(purchase, financials, metrics) {
  if (purchase.amount === null || purchase.amount <= 0) {
    return { verdict: 'invalid', reason: 'invalid_amount' };
  }
  if (financials.totalSaved === 0) {
    return { verdict: 'no', reason: 'no_savings_buffer' };
  }

  const remainingBuffer = financials.totalSaved - purchase.amount;
  if (remainingBuffer < financials.expenses * MONTHS_OF_EXPENSES_FOR_NO) {
    return { verdict: 'no', reason: 'below_one_month_buffer' };
  }

  if (
    remainingBuffer <
    financials.expenses * MONTHS_OF_EXPENSES_FOR_NOT_YET
  ) {
    // V1 keeps a narrow adjustable warning band so a purchase just under the
    // three-month buffer target can still be "yes_adjust" instead of "not_yet".
    if (metrics.bufferPercentage > ADJUSTABLE_BUFFER_WARNING_SHARE) {
      return { verdict: 'not_yet', reason: 'below_three_month_buffer' };
    }
    return { verdict: 'yes_adjust', reason: 'uses_large_buffer_share' };
  }

  if (metrics.bufferPercentage > BUFFER_WARNING_SHARE) {
    return { verdict: 'yes_adjust', reason: 'uses_large_buffer_share' };
  }

  return { verdict: 'yes', reason: 'within_buffer_limits' };
}

function evaluateMonthly(purchase, financials, metrics) {
  if (purchase.amount === null || purchase.amount <= 0) {
    return { verdict: 'invalid', reason: 'invalid_amount' };
  }
  if (metrics.monthlySurplus <= 0) {
    return { verdict: 'no', reason: 'no_positive_surplus' };
  }
  if (purchase.amount > metrics.monthlySurplus) {
    return { verdict: 'no', reason: 'above_monthly_surplus' };
  }
  if (metrics.recurringPressure > 0.5) {
    return { verdict: 'not_yet', reason: 'uses_most_surplus' };
  }
  if (metrics.recurringPressure > 0.25) {
    return { verdict: 'yes_adjust', reason: 'uses_large_surplus_share' };
  }
  if (metrics.debtPressure && metrics.recurringPressure > 0.15) {
    return { verdict: 'yes_adjust', reason: 'debt_pressure' };
  }

  return { verdict: 'yes', reason: 'within_surplus_limits' };
}

export function evaluateAffordability({ purchase, financials } = {}) {
  const normalizedPurchase = normalizeAffordabilityPurchase(purchase);
  const normalizedFinancials = normalizeFinancials(financials);
  const monthlySurplus =
    normalizedFinancials.income - normalizedFinancials.expenses;
  const metrics = {
    monthlySurplus,
    savingsBufferMonths:
      normalizedFinancials.totalSaved / Math.max(normalizedFinancials.expenses, 1),
    bufferPercentage:
      normalizedPurchase.amount === null
        ? 0
        : normalizedPurchase.amount / Math.max(normalizedFinancials.totalSaved, 1),
    recurringPressure:
      normalizedPurchase.amount === null
        ? 0
        : normalizedPurchase.amount / Math.max(monthlySurplus, 1),
    debtPressure:
      normalizedFinancials.income > 0 &&
      normalizedFinancials.totalDebt > normalizedFinancials.income * 3,
  };

  const evaluator =
    normalizedPurchase.frequency === 'monthly' ? evaluateMonthly : evaluateOneTime;
  const evaluation = evaluator(normalizedPurchase, normalizedFinancials, metrics);

  return buildResult(
    evaluation.verdict,
    normalizedPurchase,
    normalizedFinancials,
    metrics,
    evaluation.reason
  );
}
