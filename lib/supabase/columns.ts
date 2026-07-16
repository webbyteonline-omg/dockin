// Shared column lists for Supabase `.select()` calls.
// Keeping these explicit (instead of `select("*")`) trims payload size and
// lets Postgres serve more queries straight from an index-only scan.

export const PROFILE_COLUMNS =
  "id,username,display_name,avatar_url,pulse_score,privacy_steps,privacy_location,privacy_attendance,privacy_finance,privacy_friends_only,onboarded,created_at";

export const USER_STATS_COLUMNS =
  "user_id,steps_week,mood_avg_week,attendance_pct,budget_remaining_pct,pulse_score,streak,last_open,week_start,updated_at";
