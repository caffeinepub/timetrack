import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { useInternetIdentity } from "./useInternetIdentity";

const ACTOR_QUERY_KEY = "actor";
export function useActor() {
  const { identity, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();

  const actorQuery = useQuery<backendInterface>({
    queryKey: [ACTOR_QUERY_KEY, identity?.getPrincipal().toString() ?? "anon"],
    queryFn: async () => {
      const isAuthenticated = !!identity;

      if (!isAuthenticated) {
        return await createActorWithConfig();
      }

      const actorOptions = {
        agentOptions: {
          identity,
        },
      };

      const actor = await createActorWithConfig(actorOptions);
      await actor.initializeAccessControl();
      return actor;
    },
    staleTime: Number.POSITIVE_INFINITY,
    // Wait for auth initialization before creating actor — prevents anonymous actor race condition
    enabled: !isInitializing,
  });

  // When actor changes (after login), invalidate all data queries
  useEffect(() => {
    if (actorQuery.data && !isInitializing) {
      queryClient.invalidateQueries({
        predicate: (query) => !query.queryKey.includes(ACTOR_QUERY_KEY),
      });
      queryClient.refetchQueries({
        predicate: (query) => !query.queryKey.includes(ACTOR_QUERY_KEY),
      });
    }
  }, [actorQuery.data, queryClient, isInitializing]);

  return {
    actor: actorQuery.data || null,
    isFetching: actorQuery.isFetching || isInitializing,
  };
}
