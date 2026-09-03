import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      mobileOffset={{ left: 12, right: 12, top: 12 }}
      offset={{ right: 20, top: 20 }}
      position="top-right"
      style={{ fontFamily: "var(--font-pixel)" }}
      toastOptions={{
        classNames: {
          content: "min-w-0 flex-1",
          description: "mt-1 text-muted-foreground text-xs leading-snug",
          icon: "shrink-0",
          toast:
            "relative flex w-full items-start gap-3 overflow-hidden rounded-lg border border-border bg-card p-3.5 text-card-foreground shadow-[0_16px_32px_-24px_rgba(0,0,0,0.9)] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
        },
        unstyled: true,
      }}
    />
  );
}
