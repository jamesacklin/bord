import React, { useState, useRef } from "react";
import cn from "classnames";
import _ from "lodash";
import { isWithinInterval, subDays, format, subWeeks, getWeek } from "date-fns";
import { CSVLink } from "react-csv";
import {
  useChannels,
  useWrits,
  useCurios,
  useNotes,
} from "../logic/useContent";
import { useIsOverflow } from "../logic/useIsOverflow";
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
import { Bar } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import { enUS } from "date-fns/locale";

type ChartedPosts = {
  newPosts: number[];
  expandedPosts: number[];
  retainedPosts: number[];
  resurrectedPosts: number[];
  contractedPosts: number[];
  churnedPosts: number[];
};

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const chartOpts = {
  responsive: true,
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

export function WeekView() {
  const ref = useRef<HTMLDivElement>(null);

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
        return _.merge({}, writ.memo, {
          sent: new Date(parseInt(writ.memo.sent.toString().padEnd(13, "0"))),
        });
      });
    })
  );

  const hearts = _.flatten(
    _.map(curios, (curio: any) => {
      return _.map(curio.data, (curio: any) => {
        return _.merge({}, curio.heart, {
          sent: new Date(parseInt(curio.heart.sent.toString().padEnd(13, "0"))),
        });
      });
    })
  );

  const outlines = _.flatten(
    _.map(notes, (note: any) => {
      return _.map(note.data, (note: any) => {
        return _.merge({}, note, {
          sent: new Date(parseInt(note.sent.toString().padEnd(13, "0"))),
        });
      });
    })
  );

  const isAnyPending =
    _.some(writs, { status: "loading" }) ||
    _.some(curios, { status: "loading" }) ||
    _.some(notes, { status: "loading" });

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

  const periods = _.map([120, 90, 60, 30], (daysAgo) => {
    const posts = getFilteredAndOrderedPosts(allContent, daysAgo, daysAgo - 30);
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

  const weeks = _.chain(allContent)
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

  function calculatePostsByStatus(processedWeeks: any) {
    const postsByStatus: ChartedPosts = {
      newPosts: [],
      expandedPosts: [],
      retainedPosts: [],
      resurrectedPosts: [],
      contractedPosts: [],
      churnedPosts: [],
    };

    _.forEach(processedWeeks, (week) => {
      postsByStatus.newPosts.push(
        _.sumBy(_.filter(week, { isNew: true }), "cur")
      );
      postsByStatus.expandedPosts.push(
        _.sumBy(_.filter(week, { isExpanded: true }), "cur")
      );
      postsByStatus.retainedPosts.push(
        _.sumBy(_.filter(week, { isRetained: true }), "cur")
      );
      postsByStatus.resurrectedPosts.push(
        _.sumBy(_.filter(week, { isResurrected: true }), "cur")
      );
      postsByStatus.contractedPosts.push(
        _.sumBy(_.filter(week, { isContracted: true }), "cur")
      );
      postsByStatus.churnedPosts.push(
        _.sumBy(_.filter(week, { isChurned: true }), "prev")
      );
    });

    return postsByStatus;
  }

  const postsByStatus = calculatePostsByStatus(processedWeeks);

  return (
    <div className="p-4">
      <div className="mb-4">
        <GroupNav />
      </div>
      <Card loading={isAnyPending} className="mb-4">
        <h2 className="text-lg font-bold mb-2">Posts by Week</h2>
        <p className="text-gray-600 leading-5 mb-6">
          Week-by-week count of posts from users that are new, expanded,
          resurrected, retained, contracted, or churned.
        </p>
        <Bar
          /* @ts-expect-error */
          options={chartOpts}
          data={{
            // labels: ["120", "90", "60", "30"],
            labels: _.map(weeks, "week"),
            datasets: [
              {
                label: "Churned",
                data: _.map(postsByStatus.churnedPosts, (post) => post * -1),
                backgroundColor: "#e63946",
                borderColor: "#FFFFFF",
                borderWidth: 1,
              },
              {
                label: "Contracted",
                data: postsByStatus.contractedPosts,
                backgroundColor: "#f59e0b",
                borderColor: "#FFFFFF",
                borderWidth: 1,
              },
              {
                label: "Retained",
                data: postsByStatus.retainedPosts,
                backgroundColor: "#FF9040",
                borderColor: "#FFFFFF",
                borderWidth: 1,
              },
              {
                label: "Resurrected",
                data: postsByStatus.resurrectedPosts,
                backgroundColor: "#a855f7",
                borderColor: "#FFFFFF",
                borderWidth: 1,
              },
              {
                label: "Expanded",
                data: postsByStatus.expandedPosts,
                backgroundColor: "#008EFF",
                borderColor: "#FFFFFF",
                borderWidth: 1,
              },
              {
                label: "New",
                data: postsByStatus.newPosts,
                backgroundColor: "#2AD546",
                borderColor: "#FFFFFF",
                borderWidth: 1,
              },
            ],
          }}
        />
      </Card>
    </div>
  );
}
