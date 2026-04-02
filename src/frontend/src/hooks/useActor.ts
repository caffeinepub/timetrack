import { HttpAgent } from "@icp-sdk/core/agent";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { loadConfig } from "../config";
import { useInternetIdentity } from "./useInternetIdentity";

const ACTOR_QUERY_KEY = "actor";
export function useActor() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const actorQuery = useQuery<backendInterface>({
    queryKey: [ACTOR_QUERY_KEY, identity?.getPrincipal().toString()],
    queryFn: async () => {
      const config = await loadConfig();

      // Build a fresh agent with the current identity (or anonymous if not logged in)
      const agentOptions = identity ? { identity } : {};
      const agent = new HttpAgent({
        ...agentOptions,
        host: config.backend_host,
      });

      if (config.backend_host?.includes("localhost")) {
        await agent.fetchRootKey().catch(() => {});
      }

      // createActorWithConfig already builds its own agent internally,
      // so we call it with identity in agentOptions — no double-passing of agent
      const actor = await createActorWithConfig(
        identity ? { agentOptions: { identity } } : undefined,
      );

      // initializeAccessControl is best-effort — never block the actor
      try {
        await actor.initializeAccessControl();
      } catch (e) {
        console.warn("initializeAccessControl failed (non-blocking):", e);
      }

      return actor;
    },
    // Only refetch when identity changes
    staleTime: Number.POSITIVE_INFINITY,
    enabled: true,
  });

  // When the actor changes, invalidate dependent queries
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
