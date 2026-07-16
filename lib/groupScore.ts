/**
 * "Group Score" — a deliberately separate metric from the app-wide Pulse
 * Score (see lib/pulseScore.ts's `computePulseScore`, which weighs
 * attendance/finance/consistency/mood and is stored on
 * user_profiles.pulse_score, shown on the profile and pulse-score pages).
 *
 * Group leaderboards use this different, simpler formula instead — weighing
 * attendance, on-time assignment submission, app-open streak, and whether
 * an expense was logged this week. It exists only for Group leaderboards;
 * it is never written back to user_profiles.pulse_score and must not be
 * confused with it. Streak input should come from the real `user_stats.streak`
 * column (there is no `user_profiles.current_streak` in this schema).
 */
export interface GroupScoreInput {
  /** Average attendance % across all subjects, 0–100. */
  attendanceAvg: number;
  /** Total assignments the member has. */
  assignmentsTotal: number;
  /** Assignments submitted or graded (i.e. not still pending/late). */
  assignmentsSubmitted: number;
  /** Consecutive-day app-open streak — from user_stats.streak. */
  streakDays: number;
  /** Whether at least one expense was logged in the last 7 days. */
  hasLoggedExpenseThisWeek: boolean;
}

export function calculateGroupScore(data: GroupScoreInput): number {
  const attendancePoints = (data.attendanceAvg / 100) * 40;

  const assignmentPoints =
    data.assignmentsTotal > 0
      ? (data.assignmentsSubmitted / data.assignmentsTotal) * 30
      : 15; // neutral if no assignments yet

  const streakPoints = Math.min(data.streakDays, 20) * 1;

  const expensePoints = data.hasLoggedExpenseThisWeek ? 10 : 0;

  const total = attendancePoints + assignmentPoints + streakPoints + expensePoints;
  return Math.round(Math.min(total, 100));
}
