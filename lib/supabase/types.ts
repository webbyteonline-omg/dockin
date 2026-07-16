// Database types for all Pulse tables. Kept in sync with
// supabase/migrations/0001_init.sql.
//
// NOTE: rows are `type` aliases (not interfaces) so they structurally satisfy
// supabase-js's GenericTable constraint (Record<string, unknown>).

export type EventType = "holiday" | "exam" | "quiz" | "assignment" | "other";
export type ExpenseCategory =
  | "food"
  | "travel"
  | "shopping"
  | "bills"
  | "education"
  | "health"
  | "entertainment"
  | "others";
export type IncomeSource = "pocket_money" | "part_time" | "transfer" | "other_income";
export type TransactionCategory = ExpenseCategory | IncomeSource;
export type TransactionType = "expense" | "income";
export type ExpenseSource = "manual" | "sms" | "screenshot";
export type AttendanceStatus = "present" | "absent";
export type AssignmentStatus = "pending" | "submitted" | "graded" | "late";
export type QuizStatus = "upcoming" | "completed" | "missed";
/** Same literal values as QuizStatus today, but kept as its own alias so the
 * two tables' status enums can diverge later without silently miscompiling. */
export type ExamStatus = QuizStatus;
export type ExamType = "midterm" | "final" | "unit_test" | "practical" | "other";

export type Subject = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  total_classes: number;
  attended_classes: number;
  required_percentage: number;
  created_at: string;
};

export type AttendanceLog = {
  id: string;
  user_id: string;
  subject_id: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  created_at: string;
};

export type AcademicEvent = {
  id: string;
  user_id: string;
  title: string;
  event_type: EventType | null;
  date: string; // YYYY-MM-DD
  description: string | null;
  subject_id: string | null;
  notified_3day: boolean;
  notified_1day: boolean;
  created_at: string;
};

export type Assignment = {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  description: string | null;
  due_date: string; // YYYY-MM-DD
  status: AssignmentStatus;
  score: number | null;
  max_score: number | null;
  submitted_at: string | null;
  created_at: string;
};

export type Quiz = {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  syllabus: string | null;
  date: string; // YYYY-MM-DD
  status: QuizStatus;
  score: number | null;
  max_score: number | null;
  created_at: string;
};

export type Exam = {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  exam_type: ExamType;
  date: string; // YYYY-MM-DD
  syllabus: string | null;
  status: ExamStatus;
  score: number | null;
  max_score: number | null;
  created_at: string;
};

export type Expense = {
  id: string;
  user_id: string;
  amount: number;
  merchant: string | null;
  /** Expense category. May still hold a legacy income-source string on old
   *  rows from before income tracking was removed from the app. */
  category: TransactionCategory | null;
  note: string | null;
  date: string; // YYYY-MM-DD
  source: ExpenseSource | null;
  transaction_type: TransactionType;
  created_at: string;
};

export type Budget = {
  id: string;
  user_id: string;
  month: number;
  year: number;
  category: string;
  amount: number;
};

export type PushSubscriptionJSON = {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  subscription: PushSubscriptionJSON;
  created_at: string;
};

// ---- v2 social tables -------------------------------------------------------

export type FriendRequestStatus = "pending" | "accepted" | "rejected";
export type LocationArea = "campus" | "outside";

export type UserProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  pulse_score: number;
  privacy_steps: boolean;
  privacy_location: boolean;
  privacy_attendance: boolean;
  privacy_finance: boolean;
  privacy_friends_only: boolean;
  onboarded: boolean;
  created_at: string;
};

export type FriendRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendRequestStatus;
  created_at: string;
};

export type Friendship = {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
};

export type GroupMemberRole = "admin" | "member";

export type FriendGroup = {
  id: string;
  name: string;
  avatar_emoji: string;
  avatar_image_url: string | null;
  color: string;
  created_by: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupMemberRole;
  joined_at: string;
};

export type Poll = {
  id: string;
  creator_id: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
  anonymous: boolean;
  expires_at: string | null;
  created_at: string;
};

export type PollVote = {
  id: string;
  poll_id: string;
  user_id: string;
  option_index: number;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
};

export type TimetableSlot = {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string; // HH:MM:SS
  end_time: string;
  subject_id: string;
  room: string | null;
  created_at: string;
};

export type DailyCheckin = {
  id: string;
  user_id: string;
  date: string;
  mood: number | null;
  steps: number | null;
  water_ml: number | null;
  calories: number | null;
  sleep_minutes: number | null;
  journal: string | null;
  created_at: string;
};

export type UserStats = {
  user_id: string;
  steps_week: number;
  mood_avg_week: number | null;
  attendance_pct: number | null;
  budget_remaining_pct: number | null;
  pulse_score: number;
  streak: number;
  last_open: string | null;
  week_start: string | null;
  updated_at: string;
};

export type PulseScoreRow = {
  id: string;
  user_id: string;
  date: string;
  score: number;
  breakdown: Record<string, number> | null;
};

export type LeaderboardHistoryRow = {
  id: string;
  week_start: string;
  category: string;
  user_id: string;
  value: number | null;
};

export type LocationShare = {
  user_id: string;
  area: LocationArea | null;
  encrypted_coords: string | null;
  approx_lat: number | null;
  approx_lng: number | null;
  updated_at: string;
};

/** Exact-coordinate live location for the Friends-page map — separate from
 * LocationShare's coarse campus/off-campus + encrypted system above. */
export type UserLocation = {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  is_sharing: boolean;
  last_updated: string;
  updated_at: string;
};

export type BorrowLendType = "borrowed" | "lent";
export type BorrowLendStatus = "pending" | "settled";

export type BorrowLend = {
  id: string;
  user_id: string;
  type: BorrowLendType;
  person_name: string;
  person_user_id: string | null;
  amount: number;
  reason: string | null;
  date: string;
  due_date: string | null;
  status: BorrowLendStatus;
  settled_at: string | null;
  notified_overdue: boolean;
  created_at: string;
};

type InsertOf<Row, Optional extends keyof Row> = Omit<Row, Optional> &
  Partial<Pick<Row, Optional>>;

export type SubjectInsert = InsertOf<
  Subject,
  "id" | "created_at" | "color" | "total_classes" | "attended_classes" | "required_percentage"
>;
export type AttendanceLogInsert = InsertOf<AttendanceLog, "id" | "created_at" | "date">;
export type AcademicEventInsert = InsertOf<
  AcademicEvent,
  "id" | "created_at" | "description" | "subject_id" | "notified_3day" | "notified_1day"
>;
export type ExpenseInsert = InsertOf<
  Expense,
  "id" | "created_at" | "merchant" | "note" | "transaction_type"
>;
export type BudgetInsert = InsertOf<Budget, "id">;
export type PushSubscriptionInsert = InsertOf<PushSubscriptionRow, "id" | "created_at">;
export type AssignmentInsert = InsertOf<
  Assignment,
  "id" | "subject_id" | "description" | "status" | "score" | "max_score" | "submitted_at" | "created_at"
>;
export type QuizInsert = InsertOf<
  Quiz,
  "id" | "subject_id" | "syllabus" | "status" | "score" | "max_score" | "created_at"
>;
export type ExamInsert = InsertOf<
  Exam,
  "id" | "subject_id" | "exam_type" | "syllabus" | "status" | "score" | "max_score" | "created_at"
>;

// --- Snaps: ephemeral view-once photos between friends ---
export type Snap = {
  id: string;
  sender_id: string;
  recipient_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
  viewed_at: string | null;
};
export type SnapInsert = InsertOf<Snap, "id" | "caption" | "created_at" | "expires_at" | "viewed_at">;

// --- Direct messages (1:1 chat) ---
export type DirectMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};
export type DirectMessageInsert = InsertOf<DirectMessage, "id" | "created_at" | "read_at">;

// --- Anonymous campus confessions ---
export type Confession = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
};
export type ConfessionInsert = InsertOf<Confession, "id" | "created_at">;

export type Database = {
  public: {
    Tables: {
      subjects: {
        Row: Subject;
        Insert: SubjectInsert;
        Update: Partial<Subject>;
        Relationships: [];
      };
      attendance_logs: {
        Row: AttendanceLog;
        Insert: AttendanceLogInsert;
        Update: Partial<AttendanceLog>;
        Relationships: [];
      };
      academic_events: {
        Row: AcademicEvent;
        Insert: AcademicEventInsert;
        Update: Partial<AcademicEvent>;
        Relationships: [];
      };
      expenses: {
        Row: Expense;
        Insert: ExpenseInsert;
        Update: Partial<Expense>;
        Relationships: [];
      };
      budgets: {
        Row: Budget;
        Insert: BudgetInsert;
        Update: Partial<Budget>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: PushSubscriptionInsert;
        Update: Partial<PushSubscriptionRow>;
        Relationships: [];
      };
      user_profiles: {
        Row: UserProfile;
        Insert: InsertOf<
          UserProfile,
          | "display_name" | "avatar_url" | "pulse_score" | "privacy_steps"
          | "privacy_location" | "privacy_attendance" | "privacy_finance"
          | "privacy_friends_only" | "onboarded" | "created_at"
        >;
        Update: Partial<UserProfile>;
        Relationships: [];
      };
      friend_requests: {
        Row: FriendRequest;
        Insert: InsertOf<FriendRequest, "id" | "status" | "created_at">;
        Update: Partial<FriendRequest>;
        Relationships: [];
      };
      friendships: {
        Row: Friendship;
        Insert: InsertOf<Friendship, "id" | "created_at">;
        Update: Partial<Friendship>;
        Relationships: [];
      };
      friend_groups: {
        Row: FriendGroup;
        Insert: InsertOf<
          FriendGroup,
          | "id" | "avatar_emoji" | "avatar_image_url" | "color" | "invite_code"
          | "created_at" | "updated_at"
        >;
        Update: Partial<FriendGroup>;
        Relationships: [];
      };
      group_members: {
        Row: GroupMember;
        Insert: InsertOf<GroupMember, "id" | "role" | "joined_at">;
        Update: Partial<GroupMember>;
        Relationships: [];
      };
      polls: {
        Row: Poll;
        Insert: InsertOf<Poll, "id" | "votes" | "anonymous" | "expires_at" | "created_at">;
        Update: Partial<Poll>;
        Relationships: [];
      };
      poll_votes: {
        Row: PollVote;
        Insert: InsertOf<PollVote, "id" | "created_at">;
        Update: Partial<PollVote>;
        Relationships: [];
      };
      activity_logs: {
        Row: ActivityLog;
        Insert: InsertOf<ActivityLog, "id" | "entity_id" | "old_value" | "new_value" | "created_at">;
        Update: Partial<ActivityLog>;
        Relationships: [];
      };
      timetable_slots: {
        Row: TimetableSlot;
        Insert: InsertOf<TimetableSlot, "id" | "room" | "created_at">;
        Update: Partial<TimetableSlot>;
        Relationships: [];
      };
      daily_checkins: {
        Row: DailyCheckin;
        Insert: InsertOf<
          DailyCheckin,
          "id" | "mood" | "steps" | "water_ml" | "calories" | "sleep_minutes" | "journal" | "created_at"
        >;
        Update: Partial<DailyCheckin>;
        Relationships: [];
      };
      user_stats: {
        Row: UserStats;
        Insert: InsertOf<
          UserStats,
          | "steps_week" | "mood_avg_week" | "attendance_pct" | "budget_remaining_pct"
          | "pulse_score" | "streak" | "last_open" | "week_start" | "updated_at"
        >;
        Update: Partial<UserStats>;
        Relationships: [];
      };
      pulse_scores: {
        Row: PulseScoreRow;
        Insert: InsertOf<PulseScoreRow, "id" | "breakdown">;
        Update: Partial<PulseScoreRow>;
        Relationships: [];
      };
      leaderboard_history: {
        Row: LeaderboardHistoryRow;
        Insert: InsertOf<LeaderboardHistoryRow, "id" | "value">;
        Update: Partial<LeaderboardHistoryRow>;
        Relationships: [];
      };
      location_shares: {
        Row: LocationShare;
        Insert: InsertOf<
          LocationShare,
          "area" | "encrypted_coords" | "approx_lat" | "approx_lng" | "updated_at"
        >;
        Update: Partial<LocationShare>;
        Relationships: [];
      };
      user_locations: {
        Row: UserLocation;
        Insert: InsertOf<UserLocation, "id" | "is_sharing" | "last_updated" | "updated_at">;
        Update: Partial<UserLocation>;
        Relationships: [];
      };
      borrow_lend: {
        Row: BorrowLend;
        Insert: InsertOf<
          BorrowLend,
          | "id" | "person_user_id" | "reason" | "date" | "due_date" | "status"
          | "settled_at" | "notified_overdue" | "created_at"
        >;
        Update: Partial<BorrowLend>;
        Relationships: [];
      };
      assignments: {
        Row: Assignment;
        Insert: AssignmentInsert;
        Update: Partial<Assignment>;
        Relationships: [];
      };
      quizzes: {
        Row: Quiz;
        Insert: QuizInsert;
        Update: Partial<Quiz>;
        Relationships: [];
      };
      exams: {
        Row: Exam;
        Insert: ExamInsert;
        Update: Partial<Exam>;
        Relationships: [];
      };
      snaps: {
        Row: Snap;
        Insert: SnapInsert;
        Update: Partial<Snap>;
        Relationships: [];
      };
      direct_messages: {
        Row: DirectMessage;
        Insert: DirectMessageInsert;
        Update: Partial<DirectMessage>;
        Relationships: [];
      };
      confessions: {
        Row: Confession;
        Insert: ConfessionInsert;
        Update: Partial<Confession>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      accept_friend_request: {
        Args: { request_id: string };
        Returns: undefined;
      };
      unfriend: {
        Args: { other: string };
        Returns: undefined;
      };
      are_friends: {
        Args: { a: string; b: string };
        Returns: boolean;
      };
      cleanup_rate_limits: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
