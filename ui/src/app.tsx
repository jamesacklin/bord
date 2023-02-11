import React, { useEffect, useState } from "react";
import Urbit from "@urbit/http-api";
import { AppTile } from "./components/AppTile";
import _ from "lodash";

const api = new Urbit("", "", "bord");
api.ship = window.ship;

export function App() {
  const [groups, setGroups] = useState<any>({});

  useEffect(() => {
    async function init() {
      const groups = await api.scry({
        app: "groups",
        path: "/groups/light",
      });
      setGroups(groups);
    }

    init();
  }, []);

  useEffect(() => {
    console.log(groups);
  }, [groups]);

  return (
    <main className="">
      <div className="">
        {groups &&
          _.map(groups, (group) => {
            return (
              <div className="mb-4">
                <h2 className="text-lg font-bold">{group.meta.title}</h2>
                {Object.keys(group.fleet).map((ship) => {
                  return <div>{ship}</div>;
                })}
              </div>
            );
          })}
      </div>
    </main>
  );
}
