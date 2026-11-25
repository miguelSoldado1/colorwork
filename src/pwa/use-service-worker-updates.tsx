import { useEffect } from "react";
import { toast } from "sonner";
import Reload from "@/assets/icons/reload.svg?react";
import { Button } from "@/components/ui/button";

const UPDATE_TOAST_ID = "app-update";

export function useServiceWorkerUpdates() {
  useEffect(() => {
    if (!(import.meta.env.PROD && "serviceWorker" in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;

    function offerWhenInstalled(worker: ServiceWorker) {
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed") {
          showUpdateToast(worker);
        }
      });
    }

    function checkForUpdate() {
      if (document.visibilityState === "visible") {
        registration?.update().catch(() => undefined);
      }
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registered) => {
        registration = registered;
        if (registered.waiting) {
          showUpdateToast(registered.waiting);
        } else if (registered.installing && navigator.serviceWorker.controller) {
          offerWhenInstalled(registered.installing);
        }
        registered.addEventListener("updatefound", () => {
          if (registered.installing && navigator.serviceWorker.controller) {
            offerWhenInstalled(registered.installing);
          }
        });
      })
      .catch(() => undefined);

    document.addEventListener("visibilitychange", checkForUpdate);
    window.addEventListener("focus", checkForUpdate);
    return () => {
      document.removeEventListener("visibilitychange", checkForUpdate);
      window.removeEventListener("focus", checkForUpdate);
    };
  }, []);
}

function showUpdateToast(worker: ServiceWorker) {
  function applyUpdate() {
    if (worker.state !== "installed") {
      window.location.reload();
      return;
    }
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
    worker.postMessage({ type: "SKIP_WAITING" });
  }

  toast(<span className="block font-semibold text-[15px] leading-tight">Update ready</span>, {
    action: (
      <Button onClick={applyUpdate} size="compact">
        Reload
      </Button>
    ),
    description: "Reload to get the newest version.",
    duration: Number.POSITIVE_INFINITY,
    icon: (
      <span className="grid size-10 place-items-center rounded-sm border border-border bg-foreground/4 text-muted-foreground">
        <Reload height={24} width={24} />
      </span>
    ),
    id: UPDATE_TOAST_ID,
  });
}
