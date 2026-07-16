import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = loginSchema.extend({
  name: z.string().trim().min(2, "Tell us your name").max(50, "Keep it under 50 characters"),
});

export const subjectSchema = z.object({
  name: z.string().trim().min(1, "Subject name is required").max(60, "Too long"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Pick a color"),
  required_percentage: z
    .number({ invalid_type_error: "Enter a number" })
    .int()
    .min(1, "Min 1%")
    .max(100, "Max 100%"),
});

export const eventSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Too long"),
  event_type: z.enum(["holiday", "exam", "quiz", "assignment", "other"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  subject_id: z.string().uuid().nullable(),
  description: z.string().trim().max(500, "Too long").nullable(),
});

export const expenseSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Enter an amount" })
    .positive("Amount must be positive")
    .max(10_00_000, "That's too large"),
  category: z.enum([
    "food",
    "travel",
    "shopping",
    "bills",
    "education",
    "health",
    "entertainment",
    "others",
  ]),
  merchant: z.string().trim().max(60, "Too long").nullable(),
  note: z.string().trim().max(200, "Too long").nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  source: z.enum(["manual", "sms", "screenshot"]),
});

export const budgetSchema = z.object({
  category: z.string().min(1),
  amount: z
    .number({ invalid_type_error: "Enter an amount" })
    .min(0, "Can't be negative")
    .max(10_00_000, "That's too large"),
});

export const parsedCalendarEventSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1).max(200),
  type: z.enum(["holiday", "exam", "quiz", "assignment", "other"]).catch("other"),
  description: z.string().max(500).nullish(),
});

export const parsedCalendarSchema = z.array(parsedCalendarEventSchema);

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type SubjectInput = z.infer<typeof subjectSchema>;
export type EventInput = z.infer<typeof eventSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type ParsedCalendarEvent = z.infer<typeof parsedCalendarEventSchema>;
