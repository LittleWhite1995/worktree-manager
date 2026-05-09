import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#6366F1] text-white shadow-sm hover:bg-[#818CF8] active:scale-[0.98]",
        destructive:
          "bg-[#EF4444] text-white shadow-sm hover:bg-[#F87171] active:scale-[0.98]",
        warning:
          "bg-[#F59E0B] text-white shadow-sm hover:bg-[#FBBF24] active:scale-[0.98]",
        outline:
          "border border-[#1E1E26] bg-transparent text-[#E8E8ED] shadow-sm hover:bg-[#1A1A22] hover:text-[#E8E8ED]",
        secondary:
          "bg-[#141419] text-[#E8E8ED] shadow-sm hover:bg-[#1A1A22] border border-[#1E1E26]",
        ghost:
          "text-[#E8E8ED] hover:bg-[#141419]",
        link:
          "text-[#6366F1] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
