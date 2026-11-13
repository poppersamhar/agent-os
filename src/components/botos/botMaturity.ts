import type { Bot } from './botModel';

export const MATURITY_RUNS = 30;
export const MATURITY_SUCCESS_RATE = .9;

export function runTotals(history: Bot['history']) {
  const [stableRuns, otherRuns] = history.reduce(([completed, needsYou], [stable, other]) => [completed + stable, needsYou + other], [0, 0]);
  const totalRuns = stableRuns + otherRuns;
  return { stableRuns, totalRuns, successRate: totalRuns ? stableRuns / totalRuns : undefined };
}

export function maturityFor(bot: Pick<Bot, 'history'>) {
  const totals = runTotals(bot.history);
  const remainingRuns = Math.max(0, MATURITY_RUNS - totals.stableRuns);
  return {
    ...totals,
    remainingRuns,
    eligible: remainingRuns === 0 && (totals.successRate ?? 0) >= MATURITY_SUCCESS_RATE,
  };
}
