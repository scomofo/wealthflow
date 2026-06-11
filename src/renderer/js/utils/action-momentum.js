export function getNextActionAfterCompletion(actions = [], completedId = '') {
  return (actions || []).find(action => {
    if (!action || action.id === completedId) return false;
    const status = action.status || 'open';
    return status === 'open';
  }) || null;
}

export function buildCompletionToast(feedback) {
  return {
    message: feedback?.message || 'Nice - progress made.',
    type: 'success',
  };
}

export function shouldShowFocusFinishState(context = {}) {
  return context.source === 'focus';
}
