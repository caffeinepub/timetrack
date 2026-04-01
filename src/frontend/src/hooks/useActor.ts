import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { useInternetIdentity } from "./useInternetIdentity";

const ACTOR_QUERY_KEY = "actor";
export function useActor() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  const principalKey = identity?.getPrincipal().toString() ?? "anonymous";

  const actorQuery = useQuery<backendInterface>({
    queryKey: [ACTOR_QUERY_KEY, principalKey],
    queryFn: async () => {
      // Anonymous actor — no identity available
      if (!identity) {
        return await createActorWithConfig();
      }

      // Authenticated actor
      const actor = await createActorWithConfig({
        agentOptions: { identity },
      });

      // initializeAccessControl is non-blocking — failure must NOT prevent actor from being returned
      try {
        await actor.initializeAccessControl();
      } catch (e) {
        console.warn("initializeAccessControl failed (non-blocking):", e);
      }

      return actor;
    },
    staleTime: Number.POSITIVE_INFINITY,
    enabled: true,
  });

  // When the actor changes (i.e. user logs in and actor is now authenticated),
  // invalidate and refetch all data queries so they reload with the new identity.
  useEffect(() => {
    if (actorQuery.data) {
      queryClient.invalidateQueries({
        predicate: (query) => !query.queryKey.includes(ACTOR_QUERY_KEY),
      });
      queryClient.refetchQueries({
        predicate: (query) => !query.queryKey.includes(ACTOR_QUERY_KEY),
      });
    }
  }, [actorQuery.data, queryClient]);

  return {
    actor: actorQuery.data ?? null,
    isFetching: actorQuery.isFetching,
  };
}
