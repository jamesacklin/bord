import React, { useEffect, useState } from "react";
import _ from "lodash";
import { useUrbit } from "../logic/useUrbit";
import { useNavigate, useParams } from "react-router-dom";

export function GroupNav() {
  const [groups, setGroups] = useState<any>({});
  const navigate = useNavigate();
  const { ship, group } = useParams();
  const api = useUrbit();

  const selectGroup = (e: any) => {
    navigate(`/${e.target.value}`);
  };

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

  return (
    <div className="card">
      <label className="font-semibold text-base mb-2 block">
        Select a group
      </label>
      <select
        className="form-select appearance-none block p-2 bg-gray-50 rounded-lg border text-base  border-gray-400 focus:ring-blue-500 focus:border-blue-500 text-gray-900 w-full"
        onChange={selectGroup}
        defaultValue="Select a group"
        value={`${ship}/${group}`}
      >
        <option>Select a group</option>
        {groups &&
          _.map(Object.keys(groups), (g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
      </select>
    </div>
  );
}
