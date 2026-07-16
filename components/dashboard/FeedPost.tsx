import Image from "next/image";
import { Avatar } from "@/components/ui/Avatar";

/** A single feed post card: avatar/name/time header, photo, caption, like/comment counts. */
export function FeedPost() {
  return (
    <div className="mx-5 mb-4 rounded-hero overflow-hidden flat-card-plain">
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5">
        <Avatar name="Priya Nair" size={34} />
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-bold text-ink">Priya Nair</div>
          <div className="text-[11.5px] text-ink-faint">18 min ago · Hostel D lawn</div>
        </div>
      </div>
      <div className="relative w-full aspect-[4/3] bg-line/[0.06]">
        <Image src="/dockin/campus-sunset.png" alt="Priya's snap from the lawn" fill className="object-cover" />
      </div>
      <div className="px-4 pt-3 pb-4">
        <div className="text-[13.5px] text-ink">golden hour &gt; lectures</div>
        <div className="flex gap-3.5 mt-2.5 text-[12.5px] text-ink-dim font-semibold">
          <span>♥ 24</span>
          <span>💬 6</span>
        </div>
      </div>
    </div>
  );
}
