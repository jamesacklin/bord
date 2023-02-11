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
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

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
    if (!selectedGroup) return;
    async function getFleet() {
      const group = await api.scry({
        app: "groups",
        path: `/groups/${selectedGroup}`,
      });
      setFleet(Object.keys(group.fleet));
    }

    getFleet();
  }, [selectedGroup]);

  useEffect(() => {
    const matches = _.intersection(input, fleet);
    setMatches(matches);
  }, [input, fleet, selectedGroup]);

  const selectGroup = (e: any) => {
    const group = _.findKey(groups, (group) => {
      return group.meta.title === e.target.value;
    });
    setSelectedGroup(group);
  };

  const processList = (e: any) => {
    const splitLines = (value: string) => value.split(/\r?\n/);
    const inputArray: React.SetStateAction<any[]> = [];
    splitLines(e.target.value).map((line) => {
      inputArray.push(line);
    });
    setInput(inputArray);
  };

  return (
    <main className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md">
        <header className="text-center mb-12">
          <h1 className="text-2xl font-semibold mb-2">bord</h1>
          <p className="text-base font-semibold">
            Check the onboarding status of your group
          </p>
        </header>
        <label className="font-semibold text-base mb-2 block">
          Select a group
        </label>
        <select
          className="form-select appearance-none block p-2 bg-gray-50 rounded-lg border text-base  border-gray-400 focus:ring-blue-500 focus:border-blue-500 text-gray-900 w-full mb-8"
          onChange={selectGroup}
          defaultValue="Select a group"
        >
          <option disabled>Select a group</option>
          {groups &&
            _.map(groups, (group) => (
              <option key={group.meta.title}>{group.meta.title}</option>
            ))}
        </select>

        <label className="font-semibold mb-2 block text-base">
          Paste a list of ships, one ship per line
        </label>
        <textarea
          id="input"
          rows={10}
          spellCheck={false}
          className="block p-2 bg-gray-50 rounded-lg border text-base  border-gray-400 focus:ring-blue-500 focus:border-blue-500 font-mono text-gray-900 w-full"
          onChange={processList}
        />

        {fleet.length > 0 ? (
          <p className="font-semibold mt-8 py-2 px-4 text-center text-base bg-blue-100 rounded-lg text-blue-800">
            {matches.length} ships from the list are in the group (
            {fleet.length} total, or{" "}
            {Math.round((matches.length / fleet.length) * 100)}%)
          </p>
        ) : null}
      </div>
    </main>
  );
}
