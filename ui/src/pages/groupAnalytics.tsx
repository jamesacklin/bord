import React, { useEffect, useState } from "react";
import _ from "lodash";
import { useParams } from "react-router-dom";
import {
  useQuery,
  useQueries,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from "react-query";
import { useUrbit } from "../logic/useUrbit";

function useChannels() {
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
    { enabled: !!ship && !!group }
  );
}

function useWrits(channels: any) {
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

function useCurios(channels: any) {
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

function useNotes(channels: any) {
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

export function GroupAnalytics() {
  const { ship, group } = useParams();
  const groupChannels = useChannels();

  const writs = useWrits(
    _.keys(groupChannels?.data).filter((channel: any) =>
      channel.includes("chat")
    )
  );

  const curios = useCurios(
    _.keys(groupChannels?.data).filter((channel: any) =>
      channel.includes("heap")
    )
  );

  const notes = useNotes(
    _.keys(groupChannels?.data).filter((channel: any) =>
      channel.includes("diary")
    )
  );

  console.log(notes);

  return (
    <div className="mx-auto max-w-xl font-mono">
      <h1>
        {" "}
        {ship}/{group}
      </h1>
      <div>{groupChannels.isFetching ? "Loading channel list..." : null}</div>
      <div>
        {_.some(writs, { status: "loading" }) ? "Loading writs..." : ""}
      </div>
      <div>
        {_.some(curios, { status: "loading" }) ? "Loading curios..." : ""}
      </div>
      <div>
        {_.some(notes, { status: "loading" }) ? "Loading notes..." : ""}
      </div>
    </div>
  );
}
