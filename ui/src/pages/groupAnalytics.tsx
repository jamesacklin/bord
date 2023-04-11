import React, { useEffect, useState } from "react";
import cn from "classnames";
import _ from "lodash";
import { useParams } from "react-router-dom";
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
        return {
          ...writ.memo,
        };
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
        return {
          ...curio.heart,
        };
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
        return {
          ...note,
        };
      });
    })
  );

  const isAnyPending =
    _.some(curios, { status: "loading" }) ||
    _.some(notes, { status: "loading" });

  const allContent = _.concat(memos, hearts, outlines);
  const allAuthors = _.map(_.uniqBy(allContent, "author"), "author");
  const authorCounts = _.countBy(allContent, "author");
  const sortedAuthors = _.chain(allAuthors)
    .map((author) => {
      return { author, count: authorCounts[author] };
    })
    .orderBy("count", "desc")
    .value();

  return (
    <div className="mx-auto max-w-2xl font-mono overflow-scroll">
      <h1 className="my-4">
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

        <div>{allAuthors.length + 1} unique authors</div>
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">Author</th>
              <th className="text-right">Count</th>
            </tr>
          </thead>
          <tbody>
            {sortedAuthors.map((author) => {
              return (
                <tr className="even:bg-gray-100">
                  <td className="text-left w-10/12 pl-2">{author.author}</td>
                  <td className="text-right w-2/12 pr-2">{author.count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
