function normalizeAccountType(value) {
  return String(value || '').trim().toLowerCase();
}

function toAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

/**
 * Return contribution-room rows with an `available_room` value that reflects
 * contributions logged after the user's stated `known_as_of_date`.
 *
 * `known_room` is a point-in-time value: contributions on or before the
 * as-of date are assumed to already be reflected in it. Only later positive
 * contributions reduce the remaining room. Withdrawals/negative rows are not
 * treated as room restoration because TFSA and other account rules differ and
 * usually restore room on a later schedule.
 */
function reconcileContributionRoom(roomRows = [], contributions = []) {
  return (roomRows || []).map((row) => {
    const accountType = normalizeAccountType(row.account_type);
    const knownRoom = Math.max(0, toAmount(row.known_room ?? row.room));
    const asOf = row.known_as_of_date || null;

    const contributedSince = (contributions || []).reduce((sum, contribution) => {
      if (normalizeAccountType(contribution?.account_type) !== accountType) return sum;
      const amount = toAmount(contribution?.amount);
      if (amount <= 0) return sum;

      // Without a trustworthy as-of date we cannot know whether a logged
      // contribution was already included in the user's room figure.
      if (!asOf) return sum;
      if (!contribution?.date || contribution.date <= asOf) return sum;

      return sum + amount;
    }, 0);

    return {
      ...row,
      known_room: knownRoom,
      contributed_since_known: contributedSince,
      available_room: Math.max(0, knownRoom - contributedSince),
    };
  });
}

function totalAvailableContributionRoom(roomRows = [], contributions = []) {
  return reconcileContributionRoom(roomRows, contributions)
    .reduce((sum, row) => sum + row.available_room, 0);
}

module.exports = {
  reconcileContributionRoom,
  totalAvailableContributionRoom,
};
