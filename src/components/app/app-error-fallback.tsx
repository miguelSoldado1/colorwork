import { Button } from "@/components/ui/button";

export function AppErrorFallback() {
  return (
    <main className="grid min-h-svh place-items-center bg-background p-6 text-foreground">
      <div className="max-w-md text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Colorwork</p>
        <h1 className="mt-2 font-semibold text-2xl">This board needs a refresh</h1>
        <p className="mt-3 text-muted-foreground text-sm">
          Something interrupted the app. Your saved artwork stays in this browser.
        </p>
        <Button className="mt-6" onClick={() => window.location.reload()} variant="primary">
          Reload Colorwork
        </Button>
      </div>
    </main>
  );
}
