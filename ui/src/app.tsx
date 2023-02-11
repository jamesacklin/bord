import React, { useEffect, useState } from "react";
import Urbit from "@urbit/http-api";
import _ from "lodash";

const api = new Urbit("", "", "bord");
api.ship = window.ship;

export function App() {
  const [groups, setGroups] = useState<any>({});
  const [fleet, setFleet] = useState<any[]>([]);
  const [input, setInput] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    async function getGroups() {
      const groups = await api.scry({
        app: "groups",
        path: "/groups/light",
      });
      setGroups(groups);
    }

    getGroups();
  }, []);

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
    <main className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md">
        <label className="font-semibold mb-2 block">Select a group</label>
        <select className="block p-2 bg-gray-50 rounded-lg border text-sm  border-gray-400 focus:ring-blue-500 focus:border-blue-500 text-gray-900 w-full mb-8">
          {groups &&
            _.map(groups, (group) => (
              <option key={group.meta.title}>{group.meta.title}</option>
            ))}
        </select>

        <label className="font-semibold mb-2 block">
          Paste a list of ships, one ship per line
        </label>
        <textarea
          id="input"
          rows={10}
          className="block p-2 bg-gray-50 rounded-lg border text-sm  border-gray-400 focus:ring-blue-500 focus:border-blue-500 font-mono text-gray-900 w-full"
          onChange={processList}
        />

        {fleet.length > 0 && matches.length ? (
          <p className="font-semibold mt-8 py-2 px-4 text-center bg-blue-100 rounded-lg text-blue-800">
            {matches.length} ships from the list (
            {Math.round((matches.length / fleet.length) * 100)}%) are in the
            group
          </p>
        ) : null}
      </div>
    </main>
  );
}
