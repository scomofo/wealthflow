export function findRelatedActionForNudge(nudge = {}, actions = []) {
  if (!nudge || !Array.isArray(actions)) return null;

  if (nudge.related_action_id) {
    const byId = actions.find(a => a && a.id === nudge.related_action_id);
    if (byId) return byId;
  }

  const category = (nudge.related_action_category || nudge.category || '').toLowerCase();
  if (!category) return null;

  return actions.find(a => (a.category || '').toLowerCase() === category) || null;
}
