import React from "react";
import _ from "lodash";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Members } from "./pages/members";
import { GroupAnalytics } from "./pages/groupAnalytics";

export function App() {
  return (
    <Router basename="/apps/bord">
      <Routes>
        <Route index element={<div>hi</div>} />
        <Route path="/:ship/:group" element={<GroupAnalytics />} />
        <Route path="/members" element={<Members />} />
      </Routes>
    </Router>
  );
}
