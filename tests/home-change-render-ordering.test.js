// Regression coverage for the dark-mode toggle render-ordering bug:
// handleHomeChange used to fire State.updateSettings(...) without
// awaiting it, then call render() immediately — but State.updateSettings
// only updates its local cached settings after the IPC round-trip
// resolves, so that render() read the pre-toggle dark_mode value and
// applied the wrong theme for one render cycle.
const { handleHomeChange } = require('../src/renderer/js/handlers/home.js');

function fakeCheckboxTarget(field, checked) {
  return {
    classList: { contains: (cls) => cls === 'settings-input' },
    dataset: { field },
    type: 'checkbox',
    checked,
  };
}

describe('handleHomeChange settings-input dark_mode ordering', () => {
  test('render() is not called until State.updateSettings has resolved', async () => {
    const callOrder = [];
    let resolveUpdate;
    const State = {
      updateSettings: jest.fn(() => {
        callOrder.push('updateSettings-called');
        return new Promise((resolve) => {
          resolveUpdate = () => {
            callOrder.push('updateSettings-resolved');
            resolve({ dark_mode: true });
          };
        });
      }),
    };
    const render = jest.fn(() => callOrder.push('render-called'));

    const handlePromise = handleHomeChange(
      { target: fakeCheckboxTarget('dark_mode', true) },
      { State, render, getSection: () => 'settings', updateWizardDraft: jest.fn() }
    );

    // Give the microtask queue a chance to run up to the await point —
    // render() must NOT have been called yet, since updateSettings hasn't
    // resolved.
    await Promise.resolve();
    await Promise.resolve();
    expect(render).not.toHaveBeenCalled();

    resolveUpdate();
    await handlePromise;

    expect(callOrder).toEqual(['updateSettings-called', 'updateSettings-resolved', 'render-called']);
    expect(render).toHaveBeenCalledTimes(1);
  });

  test('non-dark_mode settings fields still update without forcing a render', async () => {
    const State = { updateSettings: jest.fn().mockResolvedValue({ user_name: 'Alex' }) };
    const render = jest.fn();

    await handleHomeChange(
      { target: { classList: { contains: (c) => c === 'settings-input' }, dataset: { field: 'user_name' }, type: 'text', value: 'Alex' } },
      { State, render, getSection: () => 'settings', updateWizardDraft: jest.fn() }
    );

    expect(State.updateSettings).toHaveBeenCalledWith({ user_name: 'Alex' });
    expect(render).not.toHaveBeenCalled();
  });
});
