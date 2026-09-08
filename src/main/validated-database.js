const MUTATION_METHOD = /^(add|update|upsert|delete|complete|dismiss|snooze|seed|save|clear|process|snapshot|mark)/;

const RECORD_WITH_ID = new Set([
  'addTransaction', 'updateTransaction',
  'addBudget', 'updateBudget',
  'addGoal', 'updateGoal',
  'addDebt', 'updateDebt',
  'addInvestment', 'updateInvestment',
  'addBill', 'updateBill',
  'updateChallenge', 'updateEducation',
  'addContribution',
  'addRESPBeneficiary', 'updateRESPBeneficiary',
  'addGIC', 'addRecurringLog', 'addImportHistory',
  'upsertAdvisorGoal', 'addAdvisorAsset', 'updateAdvisorAsset',
  'addAdvisorDocument', 'addCommunityPost', 'addUndoEntry',
  'addRecommendedAction', 'upsertNextBestAction',
]);

const RECORD_ONLY = new Set([
  'updateSettings', 'updatePrincipalResidence',
  'updateAdvisorPersonal', 'updateAdvisorEmployment', 'updateAdvisorRisk',
  'updateAdvisorRegistered', 'updateAdvisorInsurance',
  'seedSampleData', 'saveMonthlyReport', 'updatePersonalizationProfile',
]);

const ID_FIRST = new Set([
  'deleteTransaction', 'deleteBudget', 'deleteGoal', 'deleteDebt',
  'deleteInvestment', 'deleteBill', 'deleteContributionRoom',
  'deleteContribution', 'deleteRESPBeneficiary', 'deleteGIC',
  'deleteAdvisorGoal', 'deleteAdvisorAsset', 'deleteAdvisorDocument',
  'deleteUndoEntry', 'completeRecommendedAction', 'deleteRecommendedAction',
  'completeNextBestAction', 'dismissNextBestAction',
]);

function assertId(value, name = 'id') {
  if (typeof value !== 'string' || !value.trim() || value.length > 200) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
}

function assertString(value, name, { allowEmpty = false, maxLength = 10000 } = {}) {
  if (typeof value !== 'string') throw new TypeError(`${name} must be a string`);
  if (!allowEmpty && !value.trim()) throw new TypeError(`${name} must not be empty`);
  if (value.length > maxLength) throw new TypeError(`${name} is too long`);
}

function assertFiniteNumber(value, name, { min = -Infinity, max = Infinity } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  if (value < min || value > max) {
    throw new RangeError(`${name} is outside the allowed range`);
  }
}

function assertPlainData(value, name = 'payload', depth = 0) {
  if (depth > 8) throw new TypeError(`${name} is nested too deeply`);
  if (value === null) return;

  const type = typeof value;
  if (type === 'string') {
    if (value.length > 250000) throw new TypeError(`${name} is too long`);
    return;
  }
  if (type === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${name} must contain only finite numbers`);
    return;
  }
  if (type === 'boolean') return;
  if (type === 'undefined') throw new TypeError(`${name} must not contain undefined values`);

  if (Array.isArray(value)) {
    if (value.length > 10000) throw new TypeError(`${name} contains too many items`);
    value.forEach((item, index) => assertPlainData(item, `${name}[${index}]`, depth + 1));
    return;
  }

  if (type === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      throw new TypeError(`${name} must contain plain data objects`);
    }
    for (const [key, child] of Object.entries(value)) {
      assertPlainData(child, `${name}.${key}`, depth + 1);
    }
    return;
  }

  throw new TypeError(`${name} contains an unsupported value type`);
}

function assertRecord(value, name, requireId = false) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  assertPlainData(value, name);
  if (requireId) assertId(value.id, `${name}.id`);
}

function validateCoreFinancialRecord(method, record) {
  switch (method) {
    case 'addTransaction':
    case 'updateTransaction':
      assertString(record.description, 'transaction.description', { maxLength: 2000 });
      assertFiniteNumber(record.amount, 'transaction.amount');
      assertString(record.category, 'transaction.category', { maxLength: 200 });
      assertString(record.date, 'transaction.date', { maxLength: 40 });
      break;
    case 'addBudget':
    case 'updateBudget':
      assertString(record.category, 'budget.category', { maxLength: 200 });
      assertFiniteNumber(record.amount, 'budget.amount', { min: 0 });
      break;
    case 'addGoal':
    case 'updateGoal':
      assertString(record.name, 'goal.name', { maxLength: 500 });
      assertFiniteNumber(record.target, 'goal.target', { min: 0 });
      if (record.current !== undefined) assertFiniteNumber(record.current, 'goal.current', { min: 0 });
      break;
    case 'addDebt':
    case 'updateDebt':
      assertString(record.name, 'debt.name', { maxLength: 500 });
      assertFiniteNumber(record.balance, 'debt.balance', { min: 0 });
      if (record.rate !== undefined) assertFiniteNumber(record.rate, 'debt.rate', { min: 0, max: 1000 });
      if (record.min_payment !== undefined) assertFiniteNumber(record.min_payment, 'debt.min_payment', { min: 0 });
      break;
    case 'addInvestment':
    case 'updateInvestment':
      assertString(record.symbol, 'investment.symbol', { maxLength: 50 });
      if (record.shares !== undefined) assertFiniteNumber(record.shares, 'investment.shares', { min: 0 });
      if (record.avg_cost !== undefined) assertFiniteNumber(record.avg_cost, 'investment.avg_cost', { min: 0 });
      if (record.current_price !== undefined) assertFiniteNumber(record.current_price, 'investment.current_price', { min: 0 });
      if (record.currency !== undefined && !['CAD', 'USD'].includes(record.currency)) {
        throw new TypeError('investment.currency must be CAD or USD');
      }
      if (record.exchange_rate_to_cad !== undefined) {
        assertFiniteNumber(record.exchange_rate_to_cad, 'investment.exchange_rate_to_cad', { min: 0.000001, max: 1000 });
      }
      break;
    case 'addBill':
    case 'updateBill':
      assertString(record.title, 'bill.title', { maxLength: 500 });
      assertFiniteNumber(record.amount, 'bill.amount', { min: 0 });
      assertString(record.date, 'bill.date', { maxLength: 40 });
      break;
    case 'addContribution':
      assertString(record.account_type, 'contribution.account_type', { maxLength: 50 });
      assertFiniteNumber(record.amount, 'contribution.amount', { min: 0.01 });
      assertString(record.date, 'contribution.date', { maxLength: 40 });
      break;
    default:
      break;
  }
}

function validateDatabaseMutation(method, args) {
  if (!MUTATION_METHOD.test(method)) return;

  // Every mutating call must at least contain structured-clone-safe primitive
  // data with finite numbers. This catches undefined/NaN/object leakage even
  // for less common mutation methods that do not yet have a field schema.
  args.forEach((arg, index) => assertPlainData(arg, `${method}.arg${index}`));

  if (RECORD_WITH_ID.has(method)) {
    assertRecord(args[0], method, true);
    validateCoreFinancialRecord(method, args[0]);
    return;
  }

  if (RECORD_ONLY.has(method)) {
    assertRecord(args[0], method, false);
    return;
  }

  if (ID_FIRST.has(method)) {
    assertId(args[0], `${method}.id`);
    return;
  }

  switch (method) {
    case 'addTransactionsBatch':
      if (!Array.isArray(args[0])) throw new TypeError('transactions batch must be an array');
      args[0].forEach((tx, index) => {
        assertRecord(tx, `transactions[${index}]`, true);
        validateCoreFinancialRecord('addTransaction', tx);
      });
      break;
    case 'updateCategoryByDescription':
      assertString(args[0], 'description', { maxLength: 2000 });
      assertString(args[1], 'category', { maxLength: 200 });
      break;
    case 'upsertContributionRoom':
      assertRecord(args[0], 'contributionRoom');
      assertString(args[0].account_type, 'contributionRoom.account_type', { maxLength: 50 });
      assertFiniteNumber(args[0].known_room, 'contributionRoom.known_room', { min: 0 });
      assertString(args[0].known_as_of_date, 'contributionRoom.known_as_of_date', { maxLength: 40 });
      break;
    case 'snoozeNextBestAction':
      assertId(args[0], 'snoozeNextBestAction.id');
      assertString(args[1], 'snoozeNextBestAction.untilDate', { maxLength: 40 });
      break;
    case 'updateBudgetCarried':
      assertId(args[0], 'updateBudgetCarried.id');
      assertFiniteNumber(args[1], 'updateBudgetCarried.carried');
      break;
    case 'clearStaleNextBestActions':
      if (!Array.isArray(args[0])) throw new TypeError('active action keys must be an array');
      args[0].forEach((key, index) => assertString(key, `activeKeys[${index}]`, { maxLength: 500 }));
      break;
    default:
      // Generic plain-data validation above is the baseline contract for all
      // other mutators; add field-level rules here as their domain contracts
      // become explicit.
      break;
  }
}

function createValidatedDatabase(database) {
  return new Proxy(database, {
    get(target, property) {
      const value = target[property];
      if (typeof value !== 'function') return value;
      return (...args) => {
        validateDatabaseMutation(String(property), args);
        return value.apply(target, args);
      };
    },
  });
}

module.exports = {
  createValidatedDatabase,
  validateDatabaseMutation,
  assertPlainData,
};
