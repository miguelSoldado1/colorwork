import type { ComponentProps } from "react";

const variants = {
  ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-foreground/8 hover:text-foreground",
  outline:
    "border-border bg-transparent text-muted-foreground hover:border-primary/50 hover:bg-accent/10 hover:text-accent-foreground",
  primary:
    "border-primary bg-primary text-primary-foreground shadow-[0_3px_0_#5148a8] hover:brightness-110 active:shadow-none",
  secondary: "border-border bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
} as const;

const sizes = {
  compact: "h-11 px-3",
  default: "h-11 px-4",
  icon: "size-12 p-0",
} as const;

export interface ButtonProps extends ComponentProps<"button"> {
  size?: keyof typeof sizes;
  variant?: keyof typeof variants;
}

export function Button({ className, size = "default", type = "button", variant = "secondary", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-md border font-inherit transition-[transform,color,background-color,border-color,box-shadow,filter] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className ?? ""}`}
      type={type}
      {...props}
    />
  );
}
