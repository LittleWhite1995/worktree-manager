import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-[--color-border] bg-[--color-bg-surface] px-3 py-1 text-sm text-[--color-text-primary] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[--color-text-primary] placeholder:text-[--color-text-muted] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]/40 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
