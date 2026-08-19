import { QueryClient, dehydrate, hydrate, type DehydratedState } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Transfer the server-side React Query cache to the client. Without this,
    // the server rendered real data (warmed by route loaders) while the very
    // first client render still saw an empty cache and rendered the loading
    // skeleton instead — a hydration mismatch. Shipping the cache makes the
    // first client render byte-identical to the SSR HTML, and keeps the
    // already-rendered content in place (no layout shift).
    // The payload is JSON-encoded so it satisfies the router's strict
    // serializable-payload contract (query keys/data are already plain JSON).
    dehydrate: () => ({
      queryState: JSON.stringify(dehydrate(queryClient)),
    }),
    hydrate: (dehydrated: { queryState?: string }) => {
      if (!dehydrated?.queryState) return;
      hydrate(queryClient, JSON.parse(dehydrated.queryState) as DehydratedState);
    },
  });

  return router;
};
