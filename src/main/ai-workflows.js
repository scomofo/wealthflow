const Anthropic = require('@anthropic-ai/sdk');
const { logger } = require('./logger');
const { validateWorkflowResult, normalizeWorkflowResult, buildWorkflowFallback } = require('./ai-workflow-schema');
const { buildTfsaRrspPrompt, buildDebtVsInvestingPrompt, buildMonthlyPlannerPrompt } = require('./ai-workflow-prompts');

const PROMPT_BUILDERS = {
  tfsa_rrsp_optimizer: buildTfsaRrspPrompt,
  debt_vs_investing: buildDebtVsInvestingPrompt,
  monthly_action_planner: buildMonthlyPlannerPrompt,
};

class AiWorkflowService {
  constructor() {
    this.client = null;
    this._lastKey = null;
  }

  _ensureClient(apiKey) {
    if (!apiKey) throw new Error('No API key configured. Go to Settings to add your Claude API key.');
    if (!this.client || this._lastKey !== apiKey) {
      this.client = new Anthropic({ apiKey });
      this._lastKey = apiKey;
    }
  }

  async runWorkflow(apiKey, model, workflowType, financialData) {
    this._ensureClient(apiKey);

    const promptBuilder = PROMPT_BUILDERS[workflowType];
    if (!promptBuilder) {
      return buildWorkflowFallback(workflowType, 'Unknown workflow type: ' + workflowType);
    }

    const prompt = promptBuilder(financialData);

    let response;
    try {
      response = await this._callWithRetry(model, prompt);
    } catch (err) {
      logger.error('Workflow API call failed', { workflowType, error: err.message });
      return buildWorkflowFallback(workflowType, err.message);
    }

    const raw = response.content[0]?.text || '';
    const parsed = this._parseJSON(raw);

    if (!parsed) {
      logger.warn('Failed to parse workflow JSON', { workflowType, raw: raw.slice(0, 200) });
      return buildWorkflowFallback(workflowType, 'Failed to parse AI response as JSON');
    }

    if (!validateWorkflowResult(workflowType, parsed)) {
      logger.warn('Workflow result failed validation, normalizing', { workflowType });
    }

    return normalizeWorkflowResult(workflowType, parsed);
  }

  async _callWithRetry(model, prompt, maxRetries = 2) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.client.messages.create({
          model,
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }],
        });
      } catch (err) {
        lastError = err;
        const status = err.status || err.statusCode;
        if (status === 400 || status === 401 || status === 403) throw err;
        const isRetryable = !status || status === 429 || (status >= 500 && status < 600);
        if (!isRetryable || attempt >= maxRetries) throw err;
        logger.warn('Workflow retry ' + (attempt + 1) + '/' + (maxRetries + 1), { status, error: err.message });
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    throw lastError;
  }

  _parseJSON(text) {
    try { return JSON.parse(text); } catch (_) { /* fall through */ }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(text.slice(start, end + 1)); } catch (_) { /* fall through */ }
    }
    return null;
  }
}

module.exports = { AiWorkflowService };
