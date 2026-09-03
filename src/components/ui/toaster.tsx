import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      containerAriaLabel="Notifications"
      mobileOffset={{ left: 12, right: 12, top: 12 }}
      offset={{ right: 20, top: 20 }}
      style={{ fontFamily: "var(--font-pixel)" }}
      toastOptions={{
        classNames: {
          content: "min-w-0 flex-1",
          description: "mt-1 text-muted-foreground text-xs leading-relaxed",
          icon: "m-0 grid size-8 shrink-0 place-items-center text-primary",
          title: "min-w-0",
          toast:
            "flex w-full items-center gap-3 overflow-hidden rounded-lg border border-border bg-card p-3 text-card-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
        },
        unstyled: true,
      }}
      visibleToasts={3}
    />
  );
}
