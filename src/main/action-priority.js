function scoreToPriority(score) {
  const value = Number(score) || 0;
  if (value >= 85) return 'urgent';
  if (value >= 70) return 'high';
  if (value >= 50) return 'medium';
  return 'low';
}

module.exports = { scoreToPriority };
