import React, { createContext, useContext } from "react";
import Urbit from "@urbit/http-api";

const UrbitContext = createContext(new Urbit("", "", "bord"));
const ship = window.ship;

function useUrbit() {
  const api = useContext(UrbitContext);
  return api;
}

export { useUrbit, ship };
