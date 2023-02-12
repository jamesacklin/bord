import React, { useEffect, useState } from "react";
import Urbit from "@urbit/http-api";
import _ from "lodash";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const chartOpts = {
  responsive: true,
  plugins: {
    legend: {
      position: "bottom" as const,
    },
  },
};

const api = new Urbit("", "", "bord");
api.ship = window.ship;

export function App() {
  const [groups, setGroups] = useState<any>({});
  const [fleet, setFleet] = useState<any>({});
  const [sortedFleet, setSortedFleet] = useState<any>([]);
  const [input, setInput] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  // get the groups
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

  // set the selected group
  const selectGroup = (e: any) => {
    const group = _.findKey(groups, (group) => {
      return group.meta.title === e.target.value;
    });
    setSelectedGroup(group);
  };

  // get the fleet of the selected group
  useEffect(() => {
    if (!selectedGroup) return;
    async function getFleet() {
      const group = await api.scry({
        app: "groups",
        path: `/groups/${selectedGroup}`,
      });
      setFleet(group.fleet);
    }

    getFleet();
  }, [selectedGroup]);

  // sort the fleet by join date
  useEffect(() => {
    if (!fleet) return;
    const sortedFleet = _(fleet)
      .map(function (v, k) {
        return _.merge({}, v, { ship: k });
      })
      .sortBy("joined")
      .value();

    setSortedFleet(sortedFleet);
  }, [fleet]);

  // process the input list
  const processList = (e: any) => {
    const splitLines = (value: string) => value.split(/\r?\n/);
    const inputArray: React.SetStateAction<any[]> = [];
    splitLines(e.target.value).map((line) => {
      inputArray.push(line);
    });
    setInput(inputArray);
  };

  // compare the fleet to the input list
  useEffect(() => {
    const matches = _.intersection(input, fleet);
    setMatches(matches);
  }, [input, fleet, selectedGroup]);

  // cumulatively add each item in an array to the next
  const cumulativeSum = (arr: any) => {
    return arr.reduce(
      (acc: any, val: any) => [...acc, (acc[acc.length - 1] || 0) + val],
      []
    );
  };

  return (
    <main className="flex items-start justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-2xl px-3 flex-col space-y-8 py-8">
        <header className="text-center">
          <h1 className="text-2xl font-semibold mb-2">bord</h1>
          <p className="text-base font-semibold">
            Check the onboarding status of your group
          </p>
        </header>

        <div className="bg-white rounded-lg p-4">
          <label className="font-semibold text-base mb-2 block">
            Select a group
          </label>
          <select
            className="form-select appearance-none block p-2 bg-gray-50 rounded-lg border text-base  border-gray-400 focus:ring-blue-500 focus:border-blue-500 text-gray-900 w-full"
            onChange={selectGroup}
            defaultValue="Select a group"
          >
            <option disabled>Select a group</option>
            {groups &&
              _.map(groups, (group) => (
                <option key={group.meta.title}>{group.meta.title}</option>
              ))}
          </select>
        </div>

        {!_.isEmpty(fleet) && (
          <>
            <div className="bg-white rounded-lg p-4 overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">
                Current members by Urbit date joined (
                {Object.keys(fleet).length} total)
              </h2>
              <Bar
                options={chartOpts}
                data={{
                  labels: _.uniq(_.map(sortedFleet, "joined")),
                  datasets: [
                    {
                      label: "Ship count",
                      data: cumulativeSum(
                        _.map(
                          _.groupBy(sortedFleet, "joined"),
                          (cohort) => cohort.length
                        )
                      ),
                      borderColor: "rgb(0,0,0,1)",
                      backgroundColor: "rgba(0, 0, 0, 1)",
                    },
                  ],
                }}
              />
            </div>

            <div className="bg-white rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">
                Compare member ships to list
              </h2>

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

              <p className="font-semibold mt-8 py-2 px-4 text-center text-base bg-blue-100 rounded-lg text-blue-800">
                {matches.length} ships from the list are in the group (
                {Math.round((matches.length / Object.keys(fleet).length) * 100)}
                %)
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
