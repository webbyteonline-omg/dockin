-- DockIn — Customizable 3D avatar (Ready Player Me .glb model URL).
-- avatar_url (existing) stays as the flat 2D fallback/thumbnail used in
-- lists, chat bubbles, etc. avatar_url_3d is the full-body .glb model
-- rendered on the Home screen hero slot.

alter table public.user_profiles
  add column if not exists avatar_url_3d text;
