export const promptWeights = Object.freeze({
  intent: 25, requirements: 25, clarity: 15, precision: 15, alignment: 10, integrity: 10,
});

export function hasPromptScores(value) {
  return value && Object.keys(promptWeights).every(key =>
    Number.isInteger(value[key]) && value[key] >= 0 && value[key] <= 100);
}

export function weightedPromptScore(dimensions) {
  const total = Object.entries(promptWeights).reduce((sum, [key, weight]) => sum + dimensions[key] * weight, 0);
  return total / 100;
}

export function promptAssessment(review, literalFailures) {
  const critical = literalFailures.length > 0 || review?.critical === true;
  const dimensions = hasPromptScores(review?.scores)
    ? Object.fromEntries(Object.keys(promptWeights).map(key => [key, review.scores[key]]))
    : null;
  return { critical, dimensions, score: dimensions ? weightedPromptScore(dimensions) : null };
}
