import { NextResponse } from "next/server";
import { z } from "zod";
import { parseCalendarText } from "@/lib/gemini";
import { getSupabaseServer } from "@/lib/supabase/server";

export const maxDuration = 60;

const bodySchema = z.object({
  text: z.string().min(40, "Not enough text to parse").max(200_000),
});

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const events = await parseCalendarText(parsed.data.text);
    return NextResponse.json({ events });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Calendar parsing failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
