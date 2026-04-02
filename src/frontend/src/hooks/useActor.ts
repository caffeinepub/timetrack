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
      if (!identity) {
        // Return anonymous actor if not authenticated
        return await createActorWithConfig();
      }

      // Pass identity directly — createActorWithConfig handles agent creation
      const actor = await createActorWithConfig({ identity });

      // Initialize access control non-blocking
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

  // When the actor changes (identity changed), invalidate all dependent queries
  useEffect(() => {
    if (actorQuery.data) {
      queryClient.invalidateQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        },
      });
      queryClient.refetchQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        },
      });
    }
  }, [actorQuery.data, queryClient]);

  return {
    actor: actorQuery.data || null,
    isFetching: actorQuery.isFetching,
  };
}
