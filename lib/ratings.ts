export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const LOW_RATING_AVERAGE = 2;
export const LOW_RATING_COUNT = 2;

export type Credibility = { average: number; count: number; flagged: boolean };

export function ratingScore(value: unknown) {
  const score = Number(value);
  if (!Number.isInteger(score) || score < RATING_MIN || score > RATING_MAX)
    return null;
  return score;
}

export function credibilitySummary(scores: number[]): Credibility {
  const count = scores.length;
  const average = count
    ? Math.round((scores.reduce((sum, score) => sum + score, 0) / count) * 10) /
      10
    : 0;
  return {
    average,
    count,
    flagged: count >= LOW_RATING_COUNT && average <= LOW_RATING_AVERAGE,
  };
}
