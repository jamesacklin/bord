import React from "react";
import _, { map } from "lodash";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useUrbit } from "./useUrbit";

export function useChannels() {
  const api = useUrbit();
  const { ship, group } = useParams();
  const query = useQuery({
    queryKey: ["channels", ship, group],
    queryFn: async () => {
      const g = await api.scry({
        app: "groups",
        path: `/groups/${ship}/${group}`,
      });
      return g.channels;
    },
    enabled: !!ship && !!group && !!api,
  });
  return query;
}

export function useContent(channels: any) {
  const api = useUrbit();
  const content = useQueries({
    queries: _.map(channels, (channel: any) => {
      let app: string;
      let unit: string;
      let meta: string;
      if (channel.includes("chat")) {
        app = "chat";
        unit = "writs";
        meta = "memo";
      } else if (channel.includes("heap")) {
        app = "heap";
        unit = "curios";
        meta = "heart";
      } else if (channel.includes("diary")) {
        app = "diary";
        unit = "notes";
      }
      return {
        queryKey: [channel],
        queryFn: async () => {
          const content = await api.scry({
            app: app,
            path: `/${channel}/${unit}/newest/999.999.999${
              app === "diary" ? "/outline" : ""
            }`,
          });

          if (app !== "diary") {
            return _.map(content, (c) => {
              const withSent = _.merge({}, c[meta], {
                sent: new Date(
                  parseInt(c[meta].sent.toString().padEnd(13, "0"))
                ),
              });
              return _.merge({}, withSent, c, { channel: channel });
            });
          }
          return _.map(content, (c) => {
            return _.merge(
              c,
              { sent: new Date(parseInt(c.sent.toString().padEnd(13, "0"))) },
              { channel: channel }
            );
          });
        },
        enabled: !!(channels.length > 0),
      };
    }),
  });
  return content;
}
