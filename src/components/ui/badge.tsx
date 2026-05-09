import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "outline";
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "border-transparent bg-[#6366F1]/15 text-[#818CF8]",
    secondary: "border-transparent bg-[#1A1A22] text-[#8B8B9E]",
    success: "border-transparent bg-[#10B981]/15 text-[#34D399]",
    warning: "border-transparent bg-[#F59E0B]/15 text-[#FBBF24]",
    destructive: "border-transparent bg-[#EF4444]/15 text-[#F87171]",
    outline: "border-[#1E1E26] text-[#8B8B9E]",
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
