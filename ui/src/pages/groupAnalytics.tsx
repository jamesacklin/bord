import React, { useEffect, useState } from "react";
import cn from "classnames";
import _ from "lodash";
import { useParams } from "react-router-dom";
import { isWithinInterval, subDays } from "date-fns";
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

  const memos = _.flatten(
    _.map(writs, (writ: any) => {
      return _.map(writ.data, (writ: any) => {
        return _.merge({}, writ.memo, { sent: new Date(writ.memo.sent) });
      });
    })
  );

  const curios = useCurios(
    _.keys(groupChannels?.data).filter((channel: any) =>
      channel.includes("heap")
    )
  );

  const hearts = _.flatten(
    _.map(curios, (curio: any) => {
      return _.map(curio.data, (curio: any) => {
        return _.merge({}, curio.heart, { sent: new Date(curio.heart.sent) });
      });
    })
  );

  const notes = useNotes(
    _.keys(groupChannels?.data).filter((channel: any) =>
      channel.includes("diary")
    )
  );

  const outlines = _.flatten(
    _.map(notes, (note: any) => {
      return _.map(note.data, (note: any) => {
        return _.merge({}, note, { sent: new Date(note.sent) });
      });
    })
  );

  const allContent = _.concat(memos, hearts, outlines);

  const periodPosts = _.chain(allContent)
    .filter((memo: any) => {
      if (
        isWithinInterval(memo.sent, {
          start: subDays(new Date(), 30),
          end: new Date(),
        })
      ) {
        return memo;
      }
    })
    .orderBy("sent", "desc")
    .value();

  const prevPeriodPosts = _.chain(allContent)
    .filter((memo: any) => {
      if (
        isWithinInterval(memo.sent, {
          start: subDays(new Date(), 60),
          end: subDays(new Date(), 30),
        })
      ) {
        return memo;
      }
    })
    .orderBy("sent", "desc")
    .value();

  function processContent() {
    const allMemos = _.concat(periodPosts, prevPeriodPosts);
    const ships = _.map(_.uniqBy(allMemos, "author"), "author");
    const allCounts = _.chain(ships)
      .map((author) => {
        const cur = _.countBy(periodPosts, "author")[author] ?? 0;
        const prev = _.countBy(prevPeriodPosts, "author")[author] ?? 0;

        // New: have posted in the current period but not the previous
        const isNew = Boolean(cur !== 0 && prev === 0);

        // Retained: have posted in both the current and previous period
        const isRetained = Boolean(cur !== 0 && prev !== 0);

        // Expanded: have posted more in the current period than the previous
        const isExpanded = Boolean(cur > prev);

        // Contracted: have posted less in the current period than the previous
        const isContracted = Boolean(cur < prev);

        // Churned: have posted in the previous period but not the current
        const isChurned = Boolean(cur === 0 && prev !== 0);

        return {
          ship: author,
          cur,
          prev,
          isNew,
          isRetained,
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

  const isAnyPending =
    _.some(writs, { status: "loading" }) ||
    _.some(curios, { status: "loading" }) ||
    _.some(notes, { status: "loading" });

  return (
    <div className="mx-auto w-full p-4">
      <h1 className="mb-4">
        {ship}/{group}
      </h1>

      <div
        className={cn(
          "relative pb-4",
          isAnyPending ? "text-gray-400" : "text-black"
        )}
      >
        {isAnyPending && (
          <div className="absolute top-32 inset-x-2/4 -translate-x-4 -translate-y-4 ">
            <Spinner />
          </div>
        )}

        <div className="mb-4">
          <ul className="list-disc list-inside">
            <li>
              {authorsWithCounts.length} unique authors over the past 60 days
            </li>
            <li>
              {_.filter(authorsWithCounts, "isRetained").length} retained
              posters
            </li>
            <li>{_.filter(authorsWithCounts, "isNew").length} new posters</li>
            <li>
              {_.filter(authorsWithCounts, "isChurned").length} churned posters
            </li>
          </ul>
        </div>

        <table className="w-full font-mono text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left w-6/12">Author</th>
              <th className="p-2 text-left w-4/12">Quality</th>
              <th className="p-2 text-right w-1/12">Posts (-30)</th>
              <th className="p-2 text-right w-1/12">Posts (-60)</th>
            </tr>
          </thead>
          <tbody>
            {authorsWithCounts.map((author) => {
              return (
                <tr key={author.ship} className="even:bg-gray-100">
                  <td className="p-2 text-left w-6/12">{author.ship}</td>
                  <td className="p-2 text-left w-4/12">
                    {author.isNew && <span className="text-blue-500">New</span>}
                    {author.isRetained && author.isExpanded && (
                      <span className="text-green-500">Retained: Expanded</span>
                    )}
                    {author.isRetained && author.isContracted && (
                      <span className="text-orange-500">
                        Retained: Contracted
                      </span>
                    )}
                    {author.isChurned && (
                      <span className="text-red-500">Churned</span>
                    )}
                  </td>
                  <td className="p-2 text-right w-1/12">{author.cur}</td>
                  <td className="p-2 text-right w-1/12">{author.prev}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
