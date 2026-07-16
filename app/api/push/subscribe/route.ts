import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({ p256dh: z.string(), auth: z.string() }),
  }),
});

const unsubscribeSchema = z.object({ endpoint: z.string().url() });

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  // De-dupe by endpoint for this user
  const { data: existing } = await supabase
    .from("push_subscriptions")
    .select("id, subscription")
    .eq("user_id", user.id);

  const endpoint = parsed.data.subscription.endpoint;
  const already = (existing ?? []).some((row) => row.subscription.endpoint === endpoint);
  if (!already) {
    const { error } = await supabase.from("push_subscriptions").insert({
      user_id: user.id,
      subscription: parsed.data.subscription,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = unsubscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { data: rows } = await supabase
    .from("push_subscriptions")
    .select("id, subscription")
    .eq("user_id", user.id);

  const toDelete = (rows ?? [])
    .filter((row) => row.subscription.endpoint === parsed.data.endpoint)
    .map((row) => row.id);

  if (toDelete.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", toDelete);
  }
  return NextResponse.json({ ok: true });
}
