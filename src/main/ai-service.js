const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

const { DEFAULT_AI_MODEL } = require('./constants');

class AiService {
  constructor() {
    this.client = null;
    this.knowledgeBase = '';
    this.conversationHistory = [];
    this._kbWatcher = null;
    this._kbReloadTimer = null;
  }

  init() {
    this._loadKnowledgeBase();
    this._watchKnowledgeBase();
  }

  _watchKnowledgeBase() {
    // Hot-reload is a dev-only convenience. In a packaged build the knowledge
    // files live inside app.asar, which fs.watch cannot watch (ENOENT), so skip it.
    try {
      if (require('electron').app?.isPackaged) return;
    } catch {
      // electron unavailable (e.g. outside the main process) — fall through to dev behavior
    }

    const kbDir = path.join(__dirname, '../knowledge');
    if (!fs.existsSync(kbDir)) return;

    try {
      this._kbWatcher = fs.watch(kbDir, { persistent: false }, (eventType, filename) => {
        // Debounce: wait 2 seconds after last change before reloading
        if (this._kbReloadTimer) clearTimeout(this._kbReloadTimer);
        this._kbReloadTimer = setTimeout(() => {
          this._kbReloadTimer = null;
          logger.info(`Knowledge base file changed (${filename || 'unknown'}), reloading...`);
          this.reloadKnowledgeBase();
        }, 2000);
      });
    } catch (err) {
      logger.error('Failed to watch knowledge base directory', { error: err.message });
    }
  }

  reloadKnowledgeBase() {
    this._loadKnowledgeBase();
    logger.info('Knowledge base reloaded');
  }

  async _withRetry(fn, maxRetries = 2, delay = 1000) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(attempt);
      } catch (error) {
        lastError = error;
        const status = error.status || error.statusCode;

        // Non-retryable errors: throw immediately
        if (status === 400 || status === 401 || status === 403) {
          throw error;
        }

        // Retryable: network errors, 429 (rate limit), 5xx
        const isRetryable = !status || status === 429 || (status >= 500 && status < 600);

        if (!isRetryable || attempt >= maxRetries) {
          throw error;
        }

        logger.warn(`Retryable error (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`, {
          status,
          message: error.message,
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  _loadKnowledgeBase() {
    const kbDir = path.join(__dirname, '../knowledge');
    const files = [];
    if (fs.existsSync(kbDir)) {
      for (const file of fs.readdirSync(kbDir)) {
        if (file.endsWith('.txt') || file.endsWith('.md')) {
          const content = fs.readFileSync(path.join(kbDir, file), 'utf-8');
          files.push(`--- ${file} ---\n${content}`);
        }
      }
    }
    this.knowledgeBase = files.join('\n\n');
  }

  _ensureClient(apiKey) {
    if (!apiKey) throw new Error('No API key configured. Go to Settings to add your Claude API key.');
    if (!this.client || this._lastKey !== apiKey) {
      this.client = new Anthropic({ apiKey });
      this._lastKey = apiKey;
    }
  }

  _buildSystemPrompt(financialContext) {
    return `You are WealthFlow AI Advisor — an expert Canadian personal financial advisor built into the WealthFlow desktop app. You specialize in Alberta and Canadian tax law, debt management, investments, registered accounts (TFSA, RRSP, RESP, FHSA), budgeting, and financial planning.

IMPORTANT RULES:
- Always provide advice specific to Canada and Alberta when relevant
- Use CAD currency formatting
- Reference the user's actual financial data when answering questions
- Be concise but thorough — give actionable advice
- When discussing tax, use current 2025/2026 brackets and rules from your knowledge base
- Include relevant disclaimers for legal/tax matters (recommend consulting a professional)
- Be warm and encouraging — celebrate financial wins, gently address concerns
- Format responses with clear structure: use line breaks between sections, bold key numbers

KNOWLEDGE BASE (Alberta Tax Law, Debt Advice & Consumer Protection):
${this.knowledgeBase}

USER'S CURRENT FINANCIAL DATA:
${financialContext}

Use the knowledge base and financial data above to provide personalized, specific advice. When the user asks about tax, debt, or financial planning, draw from the knowledge base for accurate Alberta-specific information. When they ask about their finances, reference their actual numbers.`;
  }

  _buildFinancialContext(data, options = {}) {
    if (!data) return 'No financial data available.';
    const { includePersonalDetails = false } = options;
    const parts = [];

    if (data.financials) {
      const f = data.financials;
      parts.push(`FINANCIAL SUMMARY:
- Net Worth: $${f.netWorth?.toLocaleString() || 0}
- Total Income: $${f.income?.toLocaleString() || 0}
- Total Expenses: $${f.expenses?.toLocaleString() || 0}
- Savings Rate: ${f.savingsRate?.toFixed(1) || 0}%
- Total Investments: $${f.totalInv?.toLocaleString() || 0}
- Total Debt: $${f.totalDebt?.toLocaleString() || 0}`);

      if (f.catSpending && Object.keys(f.catSpending).length > 0) {
        const cats = Object.entries(f.catSpending).sort((a, b) => b[1] - a[1]);
        parts.push(`SPENDING BY CATEGORY:\n${cats.map(([k, v]) => `- ${k}: $${v.toLocaleString()}`).join('\n')}`);
      }
    }

    if (data.budgets?.length > 0) {
      parts.push(`BUDGETS:\n${data.budgets.map(b => {
        const spent = data.financials?.catSpending?.[b.category] || 0;
        const pct = b.amount > 0 ? (spent / b.amount * 100).toFixed(0) : 0;
        return `- ${b.category}: $${spent.toLocaleString()} / $${b.amount.toLocaleString()} (${pct}%)`;
      }).join('\n')}`);
    }

    if (data.debts?.length > 0) {
      parts.push(`DEBTS:\n${data.debts.map(d => `- ${d.name}: $${d.balance.toLocaleString()} at ${d.rate}% APR, min payment $${d.min_payment}/mo (${d.type})`).join('\n')}`);
    }

    if (data.investments?.length > 0) {
      parts.push(`INVESTMENTS:\n${data.investments.map(i => {
        const value = (i.shares * i.current_price).toLocaleString();
        return `- ${i.symbol} (${i.name}): ${i.shares} shares @ $${i.current_price} = $${value} [${i.account_type}, ${i.institution || 'N/A'}]`;
      }).join('\n')}`);
    }

    if (data.goals?.length > 0) {
      parts.push(`SAVINGS GOALS:\n${data.goals.map(g => `- ${g.name}: $${g.current.toLocaleString()} / $${g.target.toLocaleString()} (${Math.round(g.current / g.target * 100)}%)`).join('\n')}`);
    }

    if (data.contributionRoom?.length > 0) {
      parts.push(`REGISTERED ACCOUNT ROOM:\n${data.contributionRoom.map(c => `- ${c.account_type.toUpperCase()}: $${c.known_room?.toLocaleString() || 0} room (as of ${c.known_as_of_date || 'unknown'})`).join('\n')}`);
    }

    if (data.advisorProfile) {
      const ap = data.advisorProfile;
      const profileParts = [];
      if (ap.personal?.province) {
        if (includePersonalDetails) {
          profileParts.push(`Name: ${ap.personal.full_name}, Province: ${ap.personal.province}, Marital: ${ap.personal.marital_status}, Dependents: ${ap.personal.dependents_count}`);
        } else {
          profileParts.push(`Province: ${ap.personal.province}, Dependents: ${ap.personal.dependents_count}`);
        }
      }
      if (ap.employment?.annual_gross_income) {
        if (includePersonalDetails) {
          profileParts.push(`Employment: ${ap.employment.employment_status}, Employer: ${ap.employment.employer_name}, Gross Income: $${ap.employment.annual_gross_income.toLocaleString()}`);
        } else {
          profileParts.push(`Employment: ${ap.employment.employment_status}, Gross Income: $${ap.employment.annual_gross_income.toLocaleString()}`);
        }
      }
      if (ap.risk?.risk_score) profileParts.push(`Risk Profile: ${ap.risk.risk_score} (score: ${ap.risk.risk_score_numeric})`);
      if (ap.registered) profileParts.push(`TFSA Room: $${ap.registered.tfsa_room?.toLocaleString() || 0}, RRSP Room: $${ap.registered.rrsp_room?.toLocaleString() || 0}, FHSA Eligible: ${ap.registered.fhsa_eligible ? 'Yes' : 'No'}, Property: ${ap.registered.property_status}`);
      if (ap.insurance) profileParts.push(`Life Insurance: ${ap.insurance.life_insurance_type || 'None'}, Will: ${ap.insurance.will_status || 'Unknown'}`);
      if (profileParts.length > 0) parts.push(`ADVISOR PROFILE:\n${profileParts.join('\n')}`);
    }

    if (data.settings) {
      parts.push(`USER SETTINGS: Name: ${data.settings.user_name}, Province: ${data.settings.province}`);
    }

    return parts.join('\n\n') || 'No financial data available.';
  }

  async chat(apiKey, model, userMessage, financialData, webContents) {
    this._ensureClient(apiKey);

    const systemPrompt = this._buildSystemPrompt(this._buildFinancialContext(financialData));

    this.conversationHistory.push({ role: 'user', content: userMessage });

    // Keep last 20 messages to stay within context limits
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }

    try {
      const fullResponse = await this._withRetry(async (attempt) => {
        if (attempt > 0 && webContents && !webContents.isDestroyed()) {
          webContents.send('ai:stream-retry', attempt);
        }

        const stream = this.client.messages.stream({
          model: model || DEFAULT_AI_MODEL,
          max_tokens: 2048,
          system: systemPrompt,
          messages: this.conversationHistory,
        });

        let response = '';

        stream.on('text', (text) => {
          response += text;
          if (webContents && !webContents.isDestroyed()) {
            webContents.send('ai:stream-chunk', text);
          }
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI response timed out after 60 seconds')), 60000)
        );
        await Promise.race([stream.finalMessage(), timeoutPromise]);
        return response;
      });

      this.conversationHistory.push({ role: 'assistant', content: fullResponse });

      if (webContents && !webContents.isDestroyed()) {
        webContents.send('ai:stream-done', fullResponse);
      }

      return fullResponse;
    } catch (error) {
      const errMsg = error.message || 'Failed to get AI response';
      if (webContents && !webContents.isDestroyed()) {
        webContents.send('ai:stream-error', errMsg);
      }
      // Remove the user message from history if we failed
      this.conversationHistory.pop();
      throw error;
    }
  }

  async categorizeTransactions(apiKey, model, descriptions) {
    this._ensureClient(apiKey);

    const response = await this._withRetry(() => this.client.messages.create({
      model: model || DEFAULT_AI_MODEL,
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Categorize these bank transaction descriptions into EXACTLY one category each.

Categories: Food/Groceries, Transport, Utilities, Entertainment, Shopping, Housing, Insurance, Healthcare, Other, Income

Return ONLY a JSON array of category strings, one per description, in the same order. No explanation or markdown.

Descriptions:
${descriptions.map((d, i) => `${i + 1}. ${d}`).join('\n')}`
      }],
    }));

    try {
      const text = response.content[0].text;
      const match = text.match(/\[[\s\S]*?\]/);
      if (match) {
        const cats = JSON.parse(match[0]);
        if (Array.isArray(cats) && cats.length === descriptions.length) return cats;
      }
      return descriptions.map(() => null);
    } catch {
      return descriptions.map(() => null);
    }
  }

  async generateMonthlyReport(apiKey, model, financialData, month, year) {
    this._ensureClient(apiKey);
    const context = this._buildFinancialContext(financialData);

    const response = await this._withRetry(() => this.client.messages.create({
      model: model || DEFAULT_AI_MODEL,
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Generate a monthly financial report for ${month}/${year}. Analyze the following data and provide:

1. **Monthly Summary**: Income, expenses, net savings
2. **Budget Performance**: Which budgets were on track, over, or under
3. **Spending Insights**: Notable trends, largest categories, unusual spending
4. **Investment Update**: Portfolio performance summary
5. **Registered Accounts**: Contribution room status
6. **Recommendations**: 2-3 actionable suggestions for next month
7. **Wins**: Highlight any positive financial behaviors

Keep it concise, encouraging, and actionable. Use Canadian financial context.

FINANCIAL DATA:
${context}

Return the report in clean markdown format.`
      }],
    }));

    return response.content[0].text;
  }

  destroy() {
    if (this._kbWatcher) {
      this._kbWatcher.close();
      this._kbWatcher = null;
    }
    if (this._kbReloadTimer) {
      clearTimeout(this._kbReloadTimer);
      this._kbReloadTimer = null;
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}

module.exports = { AiService };
