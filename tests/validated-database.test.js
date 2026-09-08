const {
  createValidatedDatabase,
  validateDatabaseMutation,
} = require('../src/main/validated-database');

describe('validated database mutation boundary', () => {
  test('rejects non-finite financial values before the database method runs', () => {
    const target = { addBudget: jest.fn() };
    const db = createValidatedDatabase(target);

    expect(() => db.addBudget({ id: 'b1', category: 'Food', amount: NaN }))
      .toThrow('finite');
    expect(target.addBudget).not.toHaveBeenCalled();
  });

  test('rejects missing IDs on update/delete mutations', () => {
    expect(() => validateDatabaseMutation('updateGoal', [{ name: 'Trip', target: 1000, current: 0 }]))
      .toThrow('updateGoal.id');
    expect(() => validateDatabaseMutation('deleteDebt', ['']))
      .toThrow('deleteDebt.id');
  });

  test('validates batch transaction records individually', () => {
    expect(() => validateDatabaseMutation('addTransactionsBatch', [[
      { id: 't1', description: 'Groceries', amount: -25, category: 'Food/Groceries', date: '2026-09-01' },
      { id: 't2', description: 'Bad', amount: Infinity, category: 'Other', date: '2026-09-02' },
    ]])).toThrow('finite');
  });

  test('validates contribution-room point-in-time fields', () => {
    expect(() => validateDatabaseMutation('upsertContributionRoom', [{
      account_type: 'TFSA',
      known_room: -1,
      known_as_of_date: '2026-09-01',
    }])).toThrow('allowed range');
  });

  test('applies baseline plain-data checks to un-specialized mutators', () => {
    expect(() => validateDatabaseMutation('updateAdvisorPersonal', [{
      full_name: 'Alex',
      dependents_count: Infinity,
    }])).toThrow('finite');

    expect(() => validateDatabaseMutation('addCommunityPost', [{
      id: 'p1', author: 'Alex', title: 'Test', body: undefined,
    }])).toThrow('undefined');
  });

  test('passes valid calls through with the original database as this', () => {
    const target = {
      prefix: 'db',
      addBudget(budget) { return `${this.prefix}:${budget.id}`; },
      listBudgets() { return [this.prefix]; },
    };
    const db = createValidatedDatabase(target);

    expect(db.addBudget({ id: 'b1', category: 'Food', amount: 500 })).toBe('db:b1');
    expect(db.listBudgets()).toEqual(['db']);
  });
});
