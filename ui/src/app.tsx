import React from "react";
import _ from "lodash";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Members } from "./pages/members";
import { Home } from "./pages/home";
import { GroupAnalytics } from "./pages/groupAnalytics";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router basename="/apps/bord">
        <Routes>
          <Route index element={<Home />} />
          <Route path="/:ship/:group" element={<GroupAnalytics />} />
          <Route path="/members" element={<Members />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}
