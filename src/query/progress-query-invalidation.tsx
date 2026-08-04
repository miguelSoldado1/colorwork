import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { subscribeToStoredProgress } from "@/coloring/progress-storage";
import { artworkQueryKeys } from "@/query/artwork-queries";

export function ProgressQueryInvalidation() {
  const queryClient = useQueryClient();

  useEffect(
    () =>
      subscribeToStoredProgress(async (artworkId) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: artworkQueryKeys.descriptions }),
          queryClient.invalidateQueries({
            exact: true,
            queryKey: artworkQueryKeys.progress(artworkId),
            refetchType: "none",
          }),
        ]);
      }),
    [queryClient]
  );

  return null;
}
