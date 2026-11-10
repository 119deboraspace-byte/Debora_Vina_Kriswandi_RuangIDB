import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva("btn", {
  variants: {
    variant: {
      primary: "btn-primary",
      accent: "btn-accent",
      secondary: "btn-secondary",
      ghost: "btn-ghost",
      danger: "btn-danger",
      link: "btn-ghost underline underline-offset-4 px-0",
    },
    size: {
      sm: "btn-sm",
      md: "",
      lg: "btn-lg",
      icon: "icon-btn",
    },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
