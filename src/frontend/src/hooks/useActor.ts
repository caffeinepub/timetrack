import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { useInternetIdentity } from "./useInternetIdentity";

const ACTOR_QUERY_KEY = "actor";
export function useActor() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principalStr = identity?.getPrincipal().toString() ?? "anonymous";

  const actorQuery = useQuery<backendInterface>({
    queryKey: [ACTOR_QUERY_KEY, principalStr],
    queryFn: async () => {
      if (!identity) {
        return await createActorWithConfig();
      }

      const actor = await createActorWithConfig({
        agentOptions: { identity },
      });

      // Non-blocking: if initializeAccessControl fails, actor still works
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
