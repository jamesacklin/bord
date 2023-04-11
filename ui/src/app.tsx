import React, { useEffect, useState } from "react";
import Urbit from "@urbit/http-api";
import _ from "lodash";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Members } from "./members";

const api = new Urbit("", "", "bord");
api.ship = window.ship;

export function App() {
  return (
    <Router basename="/apps/bord">
      <Routes>
        <Route index element={<div>hi</div>} />
        <Route path="/members" element={<Members />} />
      </Routes>
    </Router>
  );
}
