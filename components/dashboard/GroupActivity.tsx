/** White card with a rotated "NEW" sticker badge, teasing a group's latest activity (e.g. a poll). */
export function GroupActivity() {
  return (
    <div className="mx-5 mb-3.5 relative flat-card-plain rounded-hero px-[18px] py-4 flex items-center gap-3.5">
      <div className="absolute -top-2.5 right-4 bg-accent text-[#14121C] text-[10px] font-extrabold px-2.5 py-[3px] rounded-pill rotate-[4deg]">
        NEW
      </div>
      <div className="w-11 h-11 rounded-[14px] shrink-0" style={{ background: "linear-gradient(135deg,#FF2D78,#FF7A3D)" }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-ink">Dance Society — Thumka</div>
        <div className="text-[12.5px] text-ink-dim mt-0.5">New poll: rehearsal day? · 31 votes</div>
      </div>
    </div>
  );
}
