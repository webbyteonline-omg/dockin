import { GoogleGenerativeAI } from "@google/generative-ai";
import { parsedCalendarSchema, type ParsedCalendarEvent } from "./schemas";

const PROMPT = `You are parsing a college academic calendar. Extract ALL events, holidays, exams, and important dates. Return ONLY a valid JSON array, no other text:
[{"date": "YYYY-MM-DD", "title": string, "type": "holiday"|"exam"|"quiz"|"assignment"|"other", "description": string}]

Rules:
- Dates must be ISO YYYY-MM-DD. If the year is missing, infer it from context (academic calendars usually span one academic year).
- For date ranges (e.g. "12–16 Dec: End-sem exams"), emit one event per day OR one event on the start date with the range in the description — prefer one event on the start date for ranges longer than 3 days.
- type mapping: vacations/festivals/no-class days → "holiday"; end-sem/mid-sem/internal exams → "exam"; class tests/quizzes → "quiz"; submission deadlines → "assignment"; everything else → "other".
- description: short context (max 1 sentence), or "" if none.

Calendar text:
`;

/** Extract JSON array from a model response that may include markdown fences. */
function extractJSON(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON array found in Gemini response");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * Parse academic-calendar text (extracted from PDF client-side) into events
 * using Gemini Flash. Server-side only.
 */
export async function parseCalendarText(text: string): Promise<ParsedCalendarEvent[]> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key is not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
  });

  const truncated = text.slice(0, 60_000);
  const result = await model.generateContent(PROMPT + truncated);
  const raw = result.response.text();

  const json = extractJSON(raw);
  const parsed = parsedCalendarSchema.safeParse(json);
  if (!parsed.success) {
    // Salvage valid entries from a partially-malformed array
    if (Array.isArray(json)) {
      const salvaged: ParsedCalendarEvent[] = [];
      for (const item of json) {
        const one = parsedCalendarSchema.element.safeParse(item);
        if (one.success) salvaged.push(one.data);
      }
      if (salvaged.length > 0) return salvaged;
    }
    throw new Error("Gemini returned an unexpected format — try re-uploading");
  }
  return parsed.data;
}
