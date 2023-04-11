import React, { useEffect, useState } from "react";
import _ from "lodash";
import { useParams } from "react-router-dom";
import { useUrbit } from "../logic/useUrbit";

export function GroupAnalytics() {
  const api = useUrbit();
  const { ship, group } = useParams();
  const [channels, setChannels] = useState<any>([]);

  useEffect(() => {
    async function getChannels() {
      const g = await api.scry({
        app: "groups",
        path: `/groups/${ship}/${group}`,
      });
      setChannels(g.channels);
    }

    getChannels();
  }, []);

  useEffect(() => {
    if (channels.length === 0) return;
    async function getChatData() {
      const chatChannels = _.filter(_.keys(channels), (channel) => {
        return channel.startsWith("chat/");
      });
      const data = await api.scry({
        app: "chat",
        path: `/${chatChannels[6]}/writs/newest/999.999.999`,
      });
      console.log(data);
    }
    getChatData();
  }, [channels]);

  console.log(channels);

  return (
    <div>
      <h1>Group Analytics</h1>
      <p>Ship: {ship}</p>
      <p>Group: {group}</p>
    </div>
  );
}
