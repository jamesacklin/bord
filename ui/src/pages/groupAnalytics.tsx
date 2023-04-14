import React, { useState, useRef } from "react";
import cn from "classnames";
import _ from "lodash";
import { isWithinInterval, subDays } from "date-fns";
import { CSVLink } from "react-csv";
import {
  useChannels,
  useWrits,
  useCurios,
  useNotes,
} from "../logic/useContent";
import { useIsOverflow } from "../logic/useIsOverflow";
import { Spinner } from "../components/spinner";

function Card({
  children,
  className,
  loading = false,
}: {
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
}) {
  return (
    <div className={cn("card relative", className)}>
      <div className={cn(loading && "opacity-25")}>{children}</div>
      {loading && (
        <div className="absolute inset-y-2/4 inset-x-2/4 -translate-x-4 -translate-y-4 ">
          <Spinner />
        </div>
      )}
    </div>
  );
}

function SummaryRow({
  glyph,
  value,
  label,
  accent,
  className,
}: {
  glyph: string;
  value: number;
  label: string;
  accent: "orange" | "blue" | "green" | "red";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-row items-center p-1 space-x-2", className)}>
      <div
        className={cn(
          "h-6 w-6 rounded font-lg font-bold flex items-center justify-center",
          accent === "orange" && "bg-orange-50 text-orange-500",
          accent === "blue" && "bg-blue-50 text-blue-500",
          accent === "green" && "bg-green-50 text-green-500",
          accent === "red" && "bg-red-50 text-red-500"
        )}
      >
        {glyph}
      </div>
      <div className="font-semibold font-sm">
        {value} {label}
      </div>
    </div>
  );
}

export function GroupAnalytics() {
  const ref = useRef<HTMLDivElement>(null);
  const isOverflow = useIsOverflow(ref);
  const [hasScrolled, setHasScrolled] = useState(false);

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
    <div className="p-4">
      <div className="card w-full">
        <h1 className="text-lg font-bold mb-2">Group Insights</h1>
        <p className="text-gray-600">
          Get a sense of how your group is evolving over time. Learn membership
          access patterns. Observe your group as a whole.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
        <Card loading={isAnyPending}>
          <h2 className="text-lg font-bold mb-2">Total Group Value</h2>
          <p className="text-gray-600 leading-5">
            The sum of all posts from new, retained, expanded, and resurrected
            users over the past 30 days.
          </p>
          <div className="text-2xl rounded font-semibold text-blue-500 bg-blue-50 text-center py-2 mt-8">
            {posts.retained + posts.new + posts.expanded + posts.resurrected}
          </div>
        </Card>
        <Card loading={isAnyPending}>
          <h2 className="text-lg font-bold mb-2">Summary</h2>
          <p className="text-gray-600">30-day overview of change</p>
          <ul className="mt-6">
            <li>
              <SummaryRow
                glyph="↑"
                value={posts.new}
                label="new user posts"
                accent="green"
              />
            </li>
            <li>
              <SummaryRow
                glyph="↑"
                value={posts.expanded}
                label="expanded user posts"
                accent="green"
              />
            </li>
            <li className="mb-2">
              <SummaryRow
                glyph="↑"
                value={posts.resurrected}
                label="resurrected user posts"
                accent="green"
              />
            </li>
            <li className="mb-2">
              <SummaryRow
                glyph="~"
                value={posts.retained}
                label="retained user posts"
                accent="orange"
              />
            </li>
            <li>
              <SummaryRow
                glyph="↓"
                value={posts.contracted}
                label="contracted user posts"
                accent="red"
              />
            </li>
            <li>
              <SummaryRow
                glyph="↓"
                value={_.filter(authorsWithCounts, "isChurned").length}
                label="churned users"
                accent="red"
              />
            </li>
          </ul>
        </Card>
        <Card loading={isAnyPending}>
          <h2 className="text-lg font-bold mb-2">Net Post Totals</h2>
          <p className="text-gray-600 leading-5">
            Total posts by all members over the past 30, 60, and 90 days.
          </p>
          <ul className="mt-4">
            <li>
              <SummaryRow
                glyph="30"
                className="text-lg"
                value={posts.totalPeriod}
                label="posts"
                accent={
                  posts.totalPeriod > posts.totalPrevPeriod ? "green" : "red"
                }
              />
            </li>
            <li>
              <SummaryRow
                glyph="60"
                className="text-lg"
                value={posts.totalPrevPeriod}
                label="posts"
                accent={
                  posts.totalPrevPeriod > posts.totalPastPeriod
                    ? "green"
                    : "red"
                }
              />
            </li>
            <li>
              <SummaryRow
                glyph="90"
                className="text-lg"
                value={posts.totalPastPeriod}
                label="posts"
                accent="blue"
              />
            </li>
          </ul>
        </Card>
      </div>

      <Card loading={isAnyPending}>
        <div className="flex space-x-2 items-baseline justify-between">
          <div>
            <h2 className="text-lg font-bold mb-2">Member Stats</h2>
            <p className="text-gray-600 leading-5">
              Post counts for all members over the last 30, 60, and 90 days.
            </p>
          </div>
          <div>
            <CSVLink
              className="small-button whitespace-nowrap"
              data={authorsWithCounts}
            >
              Download CSV
            </CSVLink>
          </div>
        </div>
        <div
          className="max-h-96 overflow-auto mt-6 relative"
          ref={ref}
          onScroll={() => setHasScrolled(true)}
        >
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-2 font-semibold text-gray-400 text-left w-6/12">
                  Author
                </th>
                <th className="p-2 font-semibold text-gray-400 text-left w-3/12">
                  Quality
                </th>
                <th className="p-2 font-semibold text-gray-400 text-right w-1/12">
                  Posts (30d)
                </th>
                <th className="p-2 font-semibold text-gray-400 text-right w-1/12">
                  Posts (60d)
                </th>
                <th className="p-2 font-semibold text-gray-400 text-right w-1/12">
                  Posts (90d)
                </th>
              </tr>
            </thead>
            <tbody>
              {authorsWithCounts.map((author) => {
                return (
                  <tr key={author.ship} className="even:bg-gray-50">
                    <td className="p-2 text-left w-6/12 font-semibold">
                      {author.ship}
                    </td>
                    <td className="p-2 text-left w-3/12 font-semibold">
                      {author.isNew && (
                        <span className="text-blue-500">New</span>
                      )}
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
                    <td className="p-2 text-right w-1/12 font-semibold">
                      {author.cur}
                    </td>
                    <td className="p-2 text-right w-1/12 font-semibold">
                      {author.prev}
                    </td>
                    <td className="p-2 text-right w-1/12 font-semibold">
                      {author.past}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!hasScrolled && isOverflow && (
            <div className="absolute inset-x-2/4 w-32 bg-blue-50 text-center text-sm font-bold text-blue-500 rounded-xl p-2 bottom-4 -translate-x-16">
              ↓ Scroll for more
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
