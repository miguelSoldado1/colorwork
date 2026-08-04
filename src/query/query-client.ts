import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      networkMode: "always",
      retry: false,
    },
    queries: {
      networkMode: "always",
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: Number.POSITIVE_INFINITY,
    },
  },
});
