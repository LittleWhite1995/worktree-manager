import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "outline";
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "border-transparent bg-[--color-accent]/15 text-[--color-accent-hover]",
    secondary: "border-transparent bg-[--color-bg-elevated] text-[--color-text-secondary]",
    success: "border-transparent bg-[--color-success]/15 text-[--color-success-light]",
    warning: "border-transparent bg-[--color-warning]/15 text-[--color-warning-light]",
    destructive: "border-transparent bg-[--color-error]/15 text-[--color-error-light]",
    outline: "border-[--color-border] text-[--color-text-secondary]",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Badge };
