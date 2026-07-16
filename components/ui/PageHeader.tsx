import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  /** Shows the small gradient underline bar beneath the title (Chats-style). */
  underline?: boolean;
  action?: React.ReactNode;
  className?: string;
}

/** Bold Unbounded page title used at the top of list-style screens (Chats, Friends, Groups). */
export function PageHeader({ title, underline, action, className }: PageHeaderProps) {
  return (
    <div className={cn("pt-safe px-5 pb-4 flex items-center justify-between", className)}>
      <div>
        <h1 className="font-display font-extrabold text-[26px] text-ink leading-none">{title}</h1>
        {underline && <div className="w-8 h-1 rounded-full dockin-gradient-h mt-1.5" />}
      </div>
      {action}
    </div>
  );
}
