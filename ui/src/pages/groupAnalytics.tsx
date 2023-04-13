import React, { useEffect, useState } from "react";
import cn from "classnames";
import _ from "lodash";
import { useParams } from "react-router-dom";
import { isWithinInterval, subDays } from "date-fns";
import { CSVLink, CSVDownload } from "react-csv";
import {
  useChannels,
  useWrits,
  useCurios,
  useNotes,
} from "../logic/useContent";
import { Spinner } from "../components/spinner";

export function GroupAnalytics() {
  const { ship, group } = useParams();
  const groupChannels = useChannels();

  const writs = useWrits(
    _.keys(groupChannels?.data).filter((channel: any) =>
      channel.includes("chat")
    )
  );

  const curios = useCurios(
    _.keys(groupChannels?.data).filter((channel: any) =>
      channel.includes("heap")
    )
  );

  const notes = useNotes(
    _.keys(groupChannels?.data).filter((channel: any) =>
      channel.includes("diary")
    )
  );

  const memos = _.flatten(
    _.map(writs, (writ: any) => {
      return _.map(writ.data, (writ: any) => {
        return _.merge({}, writ.memo, { sent: new Date(writ.memo.sent) });
      });
    })
  );

  const hearts = _.flatten(
    _.map(curios, (curio: any) => {
      return _.map(curio.data, (curio: any) => {
        return _.merge({}, curio.heart, { sent: new Date(curio.heart.sent) });
      });
    })
  );

  const outlines = _.flatten(
    _.map(notes, (note: any) => {
      return _.map(note.data, (note: any) => {
        return _.merge({}, note, { sent: new Date(note.sent) });
      });
    })
  );

  const allContent = _.concat(memos, hearts, outlines);

  const getFilteredAndOrderedPosts = (
    content: any,
    startDaysAgo: number,
    endDaysAgo: number
  ) =>
    _.chain(content)
      .filter((item) => {
        if (
          isWithinInterval(item.sent, {
            start: subDays(new Date(), startDaysAgo),
            end: subDays(new Date(), endDaysAgo),
          })
        ) {
          return item;
        }
      })
      .orderBy("sent", "desc")
      .value();

  const periodPosts = getFilteredAndOrderedPosts(allContent, 30, 0);
  const prevPeriodPosts = getFilteredAndOrderedPosts(allContent, 60, 30);
  const pastPeriodPosts = getFilteredAndOrderedPosts(allContent, 90, 60);

  const getPostCountByAuthor = (posts: any, author: string) =>
    _.countBy(posts, "author")[author] ?? 0;

  function processContent() {
    const allMemos = _.concat(periodPosts, prevPeriodPosts, pastPeriodPosts);
    const ships = _.map(_.uniqBy(allMemos, "author"), "author");

    const allCounts = _.chain(ships)
      .map((author) => {
        const cur = getPostCountByAuthor(periodPosts, author);
        const prev = getPostCountByAuthor(prevPeriodPosts, author);
        const past = getPostCountByAuthor(pastPeriodPosts, author);

        // Retained: have posted the same in both the current and previous period
        const isRetained = Boolean(cur !== 0 && cur === prev);

        // New: have posted in the current period but not in the previous or past periods
        const isNew = Boolean(cur !== 0 && prev === 0 && past === 0);

        // Expanded: have posted more in the current period than the previous (greater than zero)
        const isExpanded = Boolean(cur > prev && prev !== 0);

        // Resurrected: haven't posted in the previous period, but posted in the current and past periods
        const isResurrected = Boolean(cur !== 0 && prev === 0 && past !== 0);

        // Contracted: have posted less in the current period than the previous (greater than zero)
        const isContracted = Boolean(cur < prev && cur !== 0);

        // Churned: have posted in either the past or previous periods but not the current
        const isChurned = Boolean(
          (past !== 0 || prev !== 0) && cur === 0 && past !== prev
        );

        return {
          ship: author,
          cur,
          prev,
          past,
          isNew,
          isRetained,
          isResurrected,
          isExpanded,
          isContracted,
          isChurned,
        };
      })
      .orderBy("cur", "desc")
      .value();

    return allCounts;
  }

  const authorsWithCounts = processContent();

  const posts = {
    retained: _.sumBy(_.filter(authorsWithCounts, "isRetained"), "cur"),
    new: _.sumBy(_.filter(authorsWithCounts, "isNew"), "cur"),
    expanded: _.sumBy(_.filter(authorsWithCounts, "isExpanded"), "cur"),
    resurrected: _.sumBy(_.filter(authorsWithCounts, "isResurrected"), "cur"),
    contracted: _.sumBy(_.filter(authorsWithCounts, "isContracted"), "prev"),
    churned: _.sumBy(_.filter(authorsWithCounts, "isChurned"), "prev"),
    totalPeriod: _.sumBy(authorsWithCounts, "cur"),
    totalPrevPeriod: _.sumBy(authorsWithCounts, "prev"),
    totalPastPeriod: _.sumBy(authorsWithCounts, "past"),
  };

  const isAnyPending =
    _.some(writs, { status: "loading" }) ||
    _.some(curios, { status: "loading" }) ||
    _.some(notes, { status: "loading" });

  return (
    <div className="mx-auto text-center w-full p-4">
      <h1 className="mb-4">
        {ship}/{group}
        <span className="block text-sm text-gray-400">
          Join all channels in this group for optimal results.
        </span>
      </h1>

      <div className={cn("relative pb-4", isAnyPending ? "opacity-50" : "")}>
        {isAnyPending && (
          <div className="absolute top-32 inset-x-2/4 -translate-x-4 -translate-y-4 ">
            <Spinner />
          </div>
        )}

        <div className="mb-4 flex flex-row justify-between items-center">
          <ul className="w-4/12">
            <li>Current Period</li>
            <li>{posts.new} posts from new users</li>
            <li>{posts.expanded} posts from expanded users</li>
            <li>{posts.resurrected} posts from resurrected users</li>
            <li className="mb-2">{posts.retained} posts from retained users</li>
            <li>
              {_.filter(authorsWithCounts, "isContracted").length} contracted
              users
            </li>
            <li>
              {_.filter(authorsWithCounts, "isChurned").length} churned users
            </li>
          </ul>
          <div className="w-4/12 text-2xl">
            Value:{" "}
            {posts.retained + posts.new + posts.expanded + posts.resurrected}
          </div>
          <ul className="w-4/12">
            <li>Net Post Totals</li>
            <li>30d: {posts.totalPeriod} posts</li>
            <li>60d: {posts.totalPrevPeriod} posts</li>
            <li>90d: {posts.totalPastPeriod} posts</li>
          </ul>
        </div>

        <div className="mb-4">
          <CSVLink data={authorsWithCounts}>Download CSV</CSVLink>
        </div>

        <table className="w-full text-base">
          <thead>
            <tr>
              <th className="p-2 border-b border-black text-left w-6/12">
                Author
              </th>
              <th className="p-2 border-b border-black text-left w-3/12">
                Quality
              </th>
              <th className="p-2 border-b border-black text-right w-1/12">
                Posts (-30)
              </th>
              <th className="p-2 border-b border-black text-right w-1/12">
                Posts (-60)
              </th>
              <th className="p-2 border-b border-black text-right w-1/12">
                Posts (-90)
              </th>
            </tr>
          </thead>
          <tbody>
            {authorsWithCounts.map((author) => {
              return (
                <tr key={author.ship} className="even:bg-gray-100">
                  <td className="p-2 text-left w-6/12 font-mono">
                    {author.ship}
                  </td>
                  <td className="p-2 text-left w-3/12">
                    {author.isNew && <span className="text-blue-500">New</span>}
                    {author.isRetained && (
                      <span className="text-green-500">Retained</span>
                    )}
                    {author.isExpanded && (
                      <span className="text-green-500">Expanded</span>
                    )}
                    {author.isContracted && (
                      <span className="text-orange-500">Contracted</span>
                    )}
                    {author.isResurrected && (
                      <span className="text-purple-500">Resurrected</span>
                    )}
                    {author.isChurned && (
                      <span className="text-red-500">Churned</span>
                    )}
                  </td>
                  <td className="p-2 text-right w-1/12 font-mono">
                    {author.cur}
                  </td>
                  <td className="p-2 text-right w-1/12 font-mono">
                    {author.prev}
                  </td>
                  <td className="p-2 text-right w-1/12 font-mono">
                    {author.past}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
