import type { ComponentProps } from "react";

const variants = {
  destructive: "border-destructive/40 bg-destructive/12 text-destructive hover:bg-destructive/20",
  destructiveGhost:
    "border-transparent bg-transparent text-muted-foreground enabled:hover:bg-destructive/10 enabled:hover:text-destructive",
  ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-foreground/6 hover:text-foreground",
  outline: "border-border bg-transparent text-muted-foreground hover:border-foreground/20 hover:text-foreground",
  primary: "border-primary bg-primary text-primary-foreground hover:brightness-108",
  secondary: "border-border bg-foreground/4 text-muted-foreground hover:bg-foreground/8 hover:text-foreground",
} as const;

const sizes = {
  compact: "h-11 px-3",
  default: "h-11 px-4",
  icon: "size-12 p-0",
} as const;

const focusTones = {
  accent: "focus-visible:outline-ring",
  neutral: "focus-visible:outline-foreground/80",
} as const;

const transitions = {
  default: "transition-[transform,color,background-color,border-color,box-shadow,filter,opacity] duration-200 ease-out",
  press: "transition-transform duration-150 ease-out",
} as const;

export interface ButtonProps extends ComponentProps<"button"> {
  focusTone?: keyof typeof focusTones;
  size?: keyof typeof sizes;
  transition?: keyof typeof transitions;
  variant?: keyof typeof variants;
}

export function Button({
  className,
  focusTone = "accent",
  size = "default",
  transition = "default",
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-md border font-inherit focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${focusTones[focusTone]} ${transitions[transition]} ${variants[variant]} ${sizes[size]} ${className ?? ""}`}
      type={type}
      {...props}
    />
  );
}
