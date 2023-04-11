import React from "react";
import _ from "lodash";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Members } from "./pages/members";

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
