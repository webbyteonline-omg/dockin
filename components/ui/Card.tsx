import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** "flat" (default): white surface + border + soft shadow. "plain": no shadow, for dense lists. */
  variant?: "flat" | "plain";
}

/** Base surface for every card in the app — flat pop-art style, no clay/neumorphic shadows. */
export function Card({ variant = "flat", className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        variant === "flat" ? "flat-card" : "flat-card-plain",
        "rounded-card",
        className
      )}
      {...props}
    />
  );
}
