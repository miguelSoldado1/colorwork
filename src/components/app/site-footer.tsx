import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="flex items-center justify-between gap-4 border-border border-t pt-4 text-muted-foreground text-xs">
      <p>Your work stays on this device.</p>
      <Link
        className="shrink-0 rounded-sm underline decoration-border underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
        to="/privacy"
      >
        Privacy
      </Link>
    </footer>
  );
}
