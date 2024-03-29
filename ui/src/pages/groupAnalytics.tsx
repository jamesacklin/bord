import React, { useState, useRef } from "react";
import cn from "classnames";
import _, { get } from "lodash";
import { isWithinInterval, subDays, format, subWeeks, getWeek } from "date-fns";
import { useChannels, useContent } from "../logic/useContent";
import { Spinner } from "../components/spinner";
import { GroupNav } from "../components/GroupNav";
import {
  Chart as ChartJS,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  BarElement,
} from "chart.js";
import { Bar, getElementAtEvent } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import { enUS } from "date-fns/locale";
import CsvDump from "../components/csv";

interface ChartedPosts {
  newPosts: number[];
  expandedPosts: number[];
  retainedPosts: number[];
  resurrectedPosts: number[];
  contractedPosts: number[];
  churnedPosts: number[];
  total: number[];
  value: number[];
}

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const chartOpts = {
  responsive: true,
  animation: false,
  adapters: {
    date: {
      locale: enUS,
    },
  },
  scales: {
    x: {
      stacked: true,
      type: "category",
    },
    y: {
      stacked: true,
      type: "linear",
    },
  },
  plugins: {
    legend: {
      position: "bottom" as const,
    },
  },
};

const prettyWeekStart = (w: any) => {
  const [year, week] = w.split("-");
  const d = new Date(year, 0, 1);
  const dayNum = (d.getDay() + 6) % 7;
  const firstMonday = d.setDate(d.getDate() - dayNum + 1);
  const weekStart = new Date(
    firstMonday + (week - 1) * 7 * 24 * 60 * 60 * 1000
  );
  return format(weekStart, "yyyy-MM-dd");
};

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
  value: number | undefined;
  label: string;
  accent: "orange" | "blue" | "green" | "purple" | "amber" | "red";
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
          accent === "purple" && "bg-purple-50 text-purple-500",
          accent === "amber" && "bg-amber-50 text-amber-500",
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
  const [period, setPeriod] = useState("week");
  const [breakoutLabel, setBreakoutLabel] = useState("");
  const [breakoutData, setBreakoutData] = useState<any>(null);
  const groupChannels = useChannels();
  const contentQuery = useContent(_.keys(groupChannels?.data));
  const content = _.flatten(_.map(contentQuery, (c) => c.data));

  const isAnyPending = contentQuery.some((q) => q.status === "pending");

  const getPostCountByAuthor = (posts: any, author: string) =>
    _.countBy(posts, "author")[author] ?? 0;

  function processContent(
    marker: string,
    periodPosts: any,
    prevPeriodPosts?: any,
    pastPeriodPosts?: any
  ) {
    const allPosts = _.concat(
      periodPosts,
      prevPeriodPosts ? prevPeriodPosts : [],
      pastPeriodPosts ? pastPeriodPosts : []
    );
    const ships = _.map(_.uniqBy(allPosts, "author"), "author");
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
          period: marker,
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

  const getFilteredAndOrderedPosts = (
    content: any,
    startDaysAgo: number,
    endDaysAgo: number
  ) =>
    _.chain(content)
      .filter((item) => {
        if (!item) {
          return false;
        }
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

  const periods = _.map([120, 90, 60, 30], (daysAgo) => {
    const posts = getFilteredAndOrderedPosts(content, daysAgo, daysAgo - 30);
    return {
      daysAgo,
      posts,
    };
  });

  const processedPeriods = _.chain(periods)
    .map((period, i) => {
      const prevPeriod = periods[i - 1];
      const pastPeriod = periods[i - 2];
      return processContent(
        period.daysAgo.toString(),
        period.posts,
        prevPeriod?.posts,
        pastPeriod?.posts
      );
    })
    .value();

  const weeks = _.chain(content)
    .filter((post) => {
      if (!post) {
        return false;
      }
      return post;
    })
    .groupBy((post) => {
      const date = post.sent;
      const week = prettyWeekStart(format(date, "yyyy-ww"));
      return week;
    })
    .map((posts, week) => {
      return {
        week,
        posts,
      };
    })
    .orderBy("week", "asc")
    .value();

  const processedWeeks = _.chain(weeks)
    .map((week, i) => {
      const prevWeek = weeks[i - 1];
      const pastWeek = weeks[i - 2];
      return processContent(
        week.week,
        week.posts,
        prevWeek?.posts,
        pastWeek?.posts
      );
    })
    .value();

  function calculatePostsByStatus(processedInterval: any) {
    const postsByStatus: ChartedPosts = {
      newPosts: [],
      expandedPosts: [],
      retainedPosts: [],
      resurrectedPosts: [],
      contractedPosts: [],
      churnedPosts: [],
      total: [],
      value: [],
    };

    _.forEach(processedInterval, (interval) => {
      postsByStatus.newPosts.push(
        _.sumBy(_.filter(interval, { isNew: true }), "cur")
      );
      postsByStatus.expandedPosts.push(
        _.sumBy(_.filter(interval, { isExpanded: true }), "cur")
      );
      postsByStatus.retainedPosts.push(
        _.sumBy(_.filter(interval, { isRetained: true }), "cur")
      );
      postsByStatus.resurrectedPosts.push(
        _.sumBy(_.filter(interval, { isResurrected: true }), "cur")
      );
      postsByStatus.contractedPosts.push(
        _.sumBy(_.filter(interval, { isContracted: true }), "cur")
      );
      postsByStatus.churnedPosts.push(
        _.sumBy(_.filter(interval, { isChurned: true }), "prev")
      );
      postsByStatus.total.push(
        _.sumBy(_.filter(interval, { isChurned: false }), "cur")
      );
      postsByStatus.value.push(
        _.sumBy(
          _.filter(interval, { isChurned: false, isContracted: false }),
          "cur"
        )
      );
    });

    return postsByStatus;
  }

  const postsByStatus = (): ChartedPosts => {
    if (period === "week") {
      return calculatePostsByStatus(processedWeeks);
    } else {
      return calculatePostsByStatus(processedPeriods);
    }
  };

  const chartRef = useRef(null);

  const chartClick = (event: any) => {
    const chart = chartRef.current;
    /* @ts-expect-error */
    const activePoints = getElementAtEvent(chart, event);
    const index = activePoints[0].index;
    if (period === "week") {
      const clickedWeek = processedWeeks[index];
      /* @ts-expect-error */
      setBreakoutLabel(chart.data.labels[index]);
      setBreakoutData(clickedWeek);
    } else {
      const clickedPeriod = processedPeriods[index];
      /* @ts-expect-error */
      setBreakoutLabel(chart.data.labels[index]);
      setBreakoutData(clickedPeriod);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <GroupNav />
      </div>

      <div className="card w-full mb-4">
        <h1 className="text-lg font-bold mb-2">Group Insights</h1>
        <p className="text-gray-600 leading-5">
          Get a sense of how your group is evolving over time. Learn membership
          access patterns. Observe your group as a whole.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
        <Card loading={isAnyPending} className="">
          <h2 className="text-lg font-bold mb-2">Display options</h2>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setPeriod("week");
                setBreakoutData(null);
              }}
              className={cn(period === "week" ? "button" : "secondary-button")}
            >
              Week-over-week
            </button>
            <button
              onClick={() => {
                setPeriod("period");
                setBreakoutData(null);
              }}
              className={cn(
                period === "period" ? "button" : "secondary-button"
              )}
            >
              30/60/90
            </button>
          </div>
        </Card>
        <Card loading={isAnyPending} className="">
          <h2 className="text-lg font-bold mb-2">Download Summary</h2>
          <CsvDump />
        </Card>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
        <Card loading={isAnyPending}>
          <h2 className="text-lg font-bold mb-2">Total Group Value</h2>
          <p className="text-gray-600 leading-5">
            The sum of all posts from new, retained, expanded, and resurrected
            users over the past {period === "week" ? "week" : "30 days"}.
          </p>
          <div className="text-2xl rounded font-semibold text-blue-500 bg-blue-50 text-center py-2 mt-8">
            {postsByStatus().value.pop()}
          </div>
        </Card>
        <Card loading={isAnyPending}>
          <h2 className="text-lg font-bold mb-2">Summary</h2>
          <p className="text-gray-600 leading-5">
            {period === "week" ? "Weekly" : "30-day"} overview of change
          </p>
          <ul className="mt-6">
            <li>
              <SummaryRow
                glyph="↑"
                value={postsByStatus().newPosts.pop()}
                label="new user posts"
                accent="green"
              />
            </li>
            <li>
              <SummaryRow
                glyph="↑"
                value={postsByStatus().expandedPosts.pop()}
                label="expanded user posts"
                accent="blue"
              />
            </li>
            <li className="mb-2">
              <SummaryRow
                glyph="↑"
                value={postsByStatus().resurrectedPosts.pop()}
                label="resurrected user posts"
                accent="purple"
              />
            </li>
            <li className="mb-2">
              <SummaryRow
                glyph="~"
                value={postsByStatus().retainedPosts.pop()}
                label="retained user posts"
                accent="orange"
              />
            </li>
            <li>
              <SummaryRow
                glyph="↓"
                value={postsByStatus().contractedPosts.pop()}
                label="contracted user posts"
                accent="amber"
              />
            </li>
            <li>
              <SummaryRow
                glyph="↓"
                value={postsByStatus().churnedPosts.pop()}
                label="churned user posts"
                accent="red"
              />
            </li>
          </ul>
        </Card>
        <Card loading={isAnyPending}>
          <h2 className="text-lg font-bold mb-2">Net Post Totals</h2>
          <p className="text-gray-600 leading-5">
            Total posts by all members over the past{" "}
            {period === "week" ? "three weeks" : "30, 60, and 90 days"}.
          </p>
          <ul className="mt-4">
            <li>
              <SummaryRow
                glyph={period === "week" ? "*" : "30"}
                className="text-lg"
                value={postsByStatus().total.pop()}
                label="posts"
                accent="blue"
              />
            </li>
            <li>
              <SummaryRow
                glyph={period === "week" ? "-1" : "60"}
                className="text-lg"
                value={postsByStatus().total.at(-2)}
                label="posts"
                accent="blue"
              />
            </li>
            <li>
              <SummaryRow
                glyph={period === "week" ? "-2" : "90"}
                className="text-lg"
                value={postsByStatus().total.at(-3)}
                label="posts"
                accent="blue"
              />
            </li>
          </ul>
        </Card>
      </div>
      <div
        className={cn(
          "grid grid-cols-1 gap-4 py-4",
          breakoutData && "sm:grid-cols-2"
        )}
      >
        <Card loading={isAnyPending} className="mb-4">
          <h2 className="text-lg font-bold mb-2">
            Posts by {period === "week" ? "week" : "period"}
          </h2>
          <p className="text-gray-600 leading-5 mb-6">
            {period === "week" ? "Week-by-week" : "Rolling 30-day"} count of
            posts from users that are new, expanded, resurrected, retained,
            contracted, or churned.
          </p>
          <Bar
            /* @ts-expect-error */
            options={chartOpts}
            ref={chartRef}
            onClick={chartClick}
            data={{
              labels:
                period === "week"
                  ? _.map(weeks, "week")
                  : ["120", "90", "60", "30"],
              datasets: [
                {
                  label: "Churned",
                  data: _.map(
                    postsByStatus().churnedPosts,
                    (post) => post * -1
                  ),
                  backgroundColor: "#e63946",
                  borderColor: "#FFFFFF",
                  borderWidth: 1,
                },
                {
                  label: "Contracted",
                  data: postsByStatus().contractedPosts,
                  backgroundColor: "#f59e0b",
                  borderColor: "#FFFFFF",
                  borderWidth: 1,
                },
                {
                  label: "Retained",
                  data: postsByStatus().retainedPosts,
                  backgroundColor: "#FF9040",
                  borderColor: "#FFFFFF",
                  borderWidth: 1,
                },
                {
                  label: "Resurrected",
                  data: postsByStatus().resurrectedPosts,
                  backgroundColor: "#a855f7",
                  borderColor: "#FFFFFF",
                  borderWidth: 1,
                },
                {
                  label: "Expanded",
                  data: postsByStatus().expandedPosts,
                  backgroundColor: "#008EFF",
                  borderColor: "#FFFFFF",
                  borderWidth: 1,
                },
                {
                  label: "New",
                  data: postsByStatus().newPosts,
                  backgroundColor: "#2AD546",
                  borderColor: "#FFFFFF",
                  borderWidth: 1,
                },
              ],
            }}
          />
        </Card>
        {breakoutData && (
          <Card loading={isAnyPending} className="mb-4">
            <div className="flex w-full justify-between items-start">
              <div>
                <h2 className="text-lg font-bold mb-2">
                  Breakout of {breakoutLabel}
                </h2>
                <p className="text-gray-600 leading-5 mb-6">
                  Leaderboard of posters in {period === "week" && "the week of"}{" "}
                  {breakoutLabel}
                  {period !== "week" && " days"}
                </p>
              </div>
              <button className="button" onClick={() => setBreakoutData(null)}>
                &times;
              </button>
            </div>
            <table className="table-auto w-full">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-2">Ship</th>
                  <th className="text-left py-2 pr-2">Current</th>
                  <th className="text-left py-2">Previous</th>
                  <th className="text-left py-2">Past</th>
                </tr>
              </thead>
              <tbody>
                {_.map(breakoutData, (i, key) => (
                  <tr key={key}>
                    {console.log(i)}
                    <td
                      className={cn(
                        "py-2 pr-2",
                        parseInt(key) & 1 ? "bg-white" : "bg-gray-50"
                      )}
                    >
                      <span
                        className={cn(
                          "font-semibold",
                          i.isNew && "text-green-500",
                          i.isContracted && "text-yellow-500",
                          i.isRetained && "text-orange-500",
                          i.isResurrected && "text-purple-500",
                          i.isExpanded && "text-blue-500",
                          i.isChurned && "text-red-500"
                        )}
                      >
                        {i.ship}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "py-2 pr-2",
                        parseInt(key) & 1 ? "bg-white" : "bg-gray-50"
                      )}
                    >
                      {i.cur}
                    </td>
                    <td
                      className={cn(
                        "py-2",
                        parseInt(key) & 1 ? "bg-white" : "bg-gray-50"
                      )}
                    >
                      {i.prev}
                    </td>
                    <td
                      className={cn(
                        "py-2 pr-2",
                        parseInt(key) & 1 ? "bg-white" : "bg-gray-50"
                      )}
                    >
                      {i.past}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
