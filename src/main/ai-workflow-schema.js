const WORKFLOW_TYPES = ['tfsa_rrsp_optimizer', 'debt_vs_investing', 'monthly_action_planner'];

const DEFAULT_DISCLAIMER = 'This is general educational guidance and not individualized tax or investment advice.';

function validateWorkflowResult(type, result) {
  if (!result || typeof result !== 'object') return false;
  if (!result.summary || typeof result.summary !== 'string') return false;
  if (!result.recommendation || typeof result.recommendation !== 'object') return false;

  if (type === 'tfsa_rrsp_optimizer' || type === 'debt_vs_investing') {
    if (!Array.isArray(result.why)) return false;
    if (!Array.isArray(result.tradeoffs)) return false;
    if (!Array.isArray(result.next_actions)) return false;
  }

  if (type === 'monthly_action_planner') {
    if (!Array.isArray(result.top_actions)) return false;
    if (!Array.isArray(result.why)) return false;
  }

  return true;
}

function normalizeWorkflowResult(type, result) {
  const normalized = { ...result };
  normalized.workflow_type = normalized.workflow_type || type;
  normalized.why = Array.isArray(normalized.why) ? normalized.why : [];
  normalized.tradeoffs = Array.isArray(normalized.tradeoffs) ? normalized.tradeoffs : [];
  normalized.next_actions = Array.isArray(normalized.next_actions) ? normalized.next_actions : [];
  normalized.confidence = normalized.confidence || 'medium';
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
