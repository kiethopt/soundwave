import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "", // Sẽ được xử lý trong logic theme
        destructive: "", // Sẽ được xử lý trong logic theme
        outline: "", // Sẽ được xử lý trong logic theme
        secondary: "", // Sẽ được xử lý trong logic theme
        ghost: "", // Sẽ được xử lý trong logic theme
        link: "", // Sẽ được xử lý trong logic theme

        // Thêm các variant tùy chỉnh từ code của bạn nếu có
        cancel: "", // Ví dụ từ code của bạn
        saveChanges: "", // Ví dụ từ code của bạn
        uploadAvatar: "", // Ví dụ từ code của bạn
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
    const { theme } = useTheme();
    const Comp = asChild ? Slot : "button";

    const themeStyles = {
      default:
        theme === "light"
          ? "bg-neutral-900 text-neutral-50 shadow hover:bg-neutral-900/90 focus-visible:ring-neutral-950"
          : "bg-neutral-50 text-neutral-900 shadow hover:bg-neutral-50/90 focus-visible:ring-neutral-300",
      destructive:
        theme === "light"
          ? "bg-red-500 text-neutral-50 shadow-sm hover:bg-red-500/90 focus-visible:ring-neutral-950"
          : "bg-red-900 text-neutral-50 shadow-sm hover:bg-red-900/90 focus-visible:ring-neutral-300",
      outline:
        theme === "light"
          ? "border border-neutral-200 bg-white shadow-sm hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-neutral-950"
          : "border border-neutral-800 bg-neutral-950 shadow-sm hover:bg-neutral-800 hover:text-neutral-50 focus-visible:ring-neutral-300",
      secondary:
        theme === "light"
          ? "bg-neutral-100 text-neutral-900 shadow-sm hover:bg-neutral-100/80 focus-visible:ring-neutral-950"
          : "bg-neutral-800 text-neutral-50 shadow-sm hover:bg-neutral-800/80 focus-visible:ring-neutral-300",
      ghost:
        theme === "light"
          ? "hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-neutral-950"
          : "hover:bg-neutral-800 hover:text-neutral-50 focus-visible:ring-neutral-300",
      link:
        theme === "light"
          ? "text-neutral-900 underline-offset-4 hover:underline focus-visible:ring-neutral-950"
          : "text-neutral-50 underline-offset-4 hover:underline focus-visible:ring-neutral-300",

      // Xử lý các variant tùy chỉnh từ code của bạn
      cancel:
        theme === "light"
          ? "bg-black text-white hover:bg-black/70 focus-visible:ring-neutral-950"
          : "bg-neutral-700 text-white shadow-sm hover:bg-neutral-700/90 focus-visible:ring-neutral-300",
      saveChanges:
        theme === "light"
          ? "bg-white text-black shadow border border-gray-200 hover:bg-neutral-100"
          : "bg-neutral-50 text-neutral-900 shadow hover:bg-neutral-50/90 focus-visible:ring-neutral-300",
      uploadAvatar:
        theme === "light"
          ? "border-neutral-200 text-neutral-900 hover:bg-neutral-100 focus-visible:ring-neutral-950"
          : "border-neutral-800 text-neutral-50 hover:bg-neutral-800 focus-visible:ring-neutral-300",
    };

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size }),
          themeStyles[variant || "default"],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
