import React, { useEffect, useState } from "react";
import Urbit from "@urbit/http-api";
import _ from "lodash";

const api = new Urbit("", "", "bord");
api.ship = window.ship;

export function App() {
  const [fleet, setFleet] = useState<any[]>([]);
  const [input, setInput] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    async function getFleet() {
      const group = await api.scry({
        app: "groups",
        path: "/groups/~nibset-napwyn/tlon",
      });
      setFleet(Object.keys(group.fleet));
    }

    getFleet();
  }, []);

  const processList = (e: any) => {
    const splitLines = (value: string) => value.split(/\r?\n/);
    const inputArray: React.SetStateAction<any[]> = [];
    splitLines(e.target.value).map((line) => {
      inputArray.push(line);
    });
    setInput(inputArray);
  };

  useEffect(() => {
    const matches = _.intersection(input, fleet);
    setMatches(matches);
  }, [input, fleet]);

  return (
    <main className="">
      <div className="">
        {matches.length &&
          fleet.length &&
          `${Math.round(
            (matches.length / fleet.length) * 100
          )}% of the list is in the group`}
        <br />
        <textarea onChange={processList} />
      </div>
    </main>
  );
}
