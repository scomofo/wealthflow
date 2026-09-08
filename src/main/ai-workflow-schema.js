const WORKFLOW_TYPES = ['tfsa_rrsp_optimizer', 'debt_vs_investing', 'monthly_action_planner'];

const DEFAULT_DISCLAIMER = 'This is general educational guidance and not individualized tax or investment advice.';
const CONFIDENCE_VALUES = new Set(['high', 'medium', 'low']);
const PRIORITY_VALUES = new Set(['high', 'medium', 'low']);
const EFFORT_VALUES = new Set(['high', 'medium', 'low']);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isBoundedString(value, maxLength = 1000) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function isStringArray(value, { maxItems = 12, maxLength = 500 } = {}) {
  return Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => isBoundedString(item, maxLength));
}

function isNextAction(action) {
  return isPlainObject(action) &&
    isBoundedString(action.title, 300) &&
    isBoundedString(action.type, 100) &&
    PRIORITY_VALUES.has(action.priority);
}

function isMonthlyAction(action) {
  return isPlainObject(action) &&
    isBoundedString(action.title, 300) &&
    isBoundedString(action.impact, 500) &&
    EFFORT_VALUES.has(action.effort) &&
    PRIORITY_VALUES.has(action.priority);
}

function validateCommon(type, result) {
  if (!WORKFLOW_TYPES.includes(type)) return false;
  if (!isPlainObject(result)) return false;
  if (result.workflow_type !== type) return false;
  if (!isBoundedString(result.summary, 1200)) return false;
  if (!isPlainObject(result.recommendation)) return false;
  if (!isBoundedString(result.recommendation.primary_action, 500)) return false;
  if (!isStringArray(result.why, { maxItems: 12, maxLength: 500 })) return false;
  if (!CONFIDENCE_VALUES.has(result.confidence)) return false;
  if (!isBoundedString(result.disclaimer, 1000)) return false;
  return true;
}

function validateWorkflowResult(type, result) {
  if (!validateCommon(type, result)) return false;

  if (type === 'tfsa_rrsp_optimizer') {
    const allocation = result.recommendation.allocation;
    if (!isPlainObject(allocation)) return false;
    if (!isBoundedString(String(allocation.tfsa ?? ''), 100)) return false;
    if (!isBoundedString(String(allocation.rrsp ?? ''), 100)) return false;
    if (!isStringArray(result.tradeoffs, { maxItems: 12, maxLength: 500 })) return false;
    if (!Array.isArray(result.next_actions) || result.next_actions.length > 10) return false;
    if (!result.next_actions.every(isNextAction)) return false;
    return true;
  }

  if (type === 'debt_vs_investing') {
    if (!isStringArray(result.recommendation.priority_order, { maxItems: 12, maxLength: 300 })) return false;
    if (!isStringArray(result.tradeoffs, { maxItems: 12, maxLength: 500 })) return false;
    if (!Array.isArray(result.next_actions) || result.next_actions.length > 10) return false;
    if (!result.next_actions.every(isNextAction)) return false;
    return true;
  }

  if (type === 'monthly_action_planner') {
    if (!Array.isArray(result.top_actions)) return false;
    if (result.top_actions.length < 1 || result.top_actions.length > 5) return false;
    if (!result.top_actions.every(isMonthlyAction)) return false;
    return true;
  }

  return false;
}

function normalizeWorkflowResult(type, result) {
  const normalized = { ...result };
  normalized.workflow_type = type;
  normalized.why = Array.isArray(normalized.why) ? normalized.why : [];
  normalized.tradeoffs = Array.isArray(normalized.tradeoffs) ? normalized.tradeoffs : [];
  normalized.next_actions = Array.isArray(normalized.next_actions) ? normalized.next_actions : [];
  normalized.confidence = CONFIDENCE_VALUES.has(normalized.confidence) ? normalized.confidence : 'medium';
  normalized.disclaimer = normalized.disclaimer || DEFAULT_DISCLAIMER;

  if (type === 'monthly_action_planner') {
    normalized.top_actions = Array.isArray(normalized.top_actions) ? normalized.top_actions : [];
  }

  return normalized;
}

function buildWorkflowFallback(type, errorMessage) {
  return {
    workflow_type: type,
    summary: 'The advisor was unable to complete this analysis.',
    recommendation: { primary_action: 'Please try again or adjust your financial data.' },
    why: [errorMessage || 'An error occurred during analysis.'],
    tradeoffs: [],
    next_actions: [],
    top_actions: type === 'monthly_action_planner' ? [] : undefined,
    confidence: 'low',
    disclaimer: DEFAULT_DISCLAIMER,
    _fallback: true,
  };
}

module.exports = { WORKFLOW_TYPES, validateWorkflowResult, normalizeWorkflowResult, buildWorkflowFallback };
