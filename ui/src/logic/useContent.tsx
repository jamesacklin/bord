import React from "react";
import _ from "lodash";
import { useQuery, useQueries } from "react-query";
import { useParams } from "react-router-dom";
import { useUrbit } from "./useUrbit";

export function useChannels() {
  const api = useUrbit();
  const { ship, group } = useParams();
  return useQuery(
    ["channels", ship, group],
    async () => {
      const g = await api.scry({
        app: "groups",
        path: `/groups/${ship}/${group}`,
      });
      return g.channels;
    },
    { enabled: !!api && !!ship && !!group }
  );
}

export function useWrits(channels: any) {
  const api = useUrbit();
  const writs = useQueries(
    _.map(channels, (channel: any) => {
      return {
        queryKey: ["writs", channel],
        queryFn: async () => {
          const c = await api.scry({
            app: "chat",
            path: `/${channel}/writs/newest/999.999.999`,
          });
          return c;
        },
        enabled: !!channel && !!api,
      };
    })
  );
  return writs;
}

export function useCurios(channels: any) {
  const api = useUrbit();
  const curios = useQueries(
    _.map(channels, (channel: any) => {
      return {
        queryKey: ["curios", channel],
        queryFn: async () => {
          const c = await api.scry({
            app: "heap",
            path: `/${channel}/curios/newest/999.999.999`,
          });
          return c;
        },
        enabled: !!channel && !!api,
      };
    })
  );
  return curios;
}

export function useNotes(channels: any) {
  const api = useUrbit();
  const notes = useQueries(
    _.map(channels, (channel: any) => {
      return {
        queryKey: ["notes", channel],
        queryFn: async () => {
          const c = await api.scry({
            app: "diary",
            path: `/${channel}/notes/newest/999.999.999/outline`,
          });
          return c;
        },
        enabled: !!channel && !!api,
      };
    })
  );
  return notes;
}
