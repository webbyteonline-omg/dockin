import { Button } from "@/components/ui/Button";

/** Dark hero card — "Who's free right now?" with a rotated LIVE sticker badge and gradient CTA. */
export function WhosFreeBar() {
  return (
    <div className="mx-5 my-3.5 relative dockin-dark rounded-hero px-5 py-[18px] overflow-hidden">
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          top: -30,
          right: -20,
          width: 120,
          height: 120,
          background: "radial-gradient(circle, rgba(255,45,120,0.4), transparent 70%)",
        }}
      />
      <div className="absolute -top-3 left-4 bg-accent text-[#14121C] text-[10.5px] font-extrabold tracking-wide px-3 py-1 rounded-pill -rotate-[4deg]">
        LIVE
      </div>
      <div className="flex items-center justify-between gap-3 relative">
        <div>
          <div className="text-white font-bold text-[15px]">Who&apos;s free right now?</div>
          <div className="text-white/60 text-[12.5px] mt-0.5">3 friends are free after 4 — Riya, Kabir, Priya</div>
        </div>
        <Button size="sm" className="whitespace-nowrap shrink-0">
          I&apos;m free
        </Button>
      </div>
    </div>
  );
}
