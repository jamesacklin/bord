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

  return (
    <div className="mx-auto max-w-xl font-mono">
      <h1>
        {" "}
        {ship}/{group}
      </h1>
      <div>{groupChannels.isFetching ? "Loading channel list..." : null}</div>
      <div>
        {_.some(writs, { status: "loading" }) ? "Loading writs..." : ""}
      </div>
      <div>
        {_.some(curios, { status: "loading" }) ? "Loading curios..." : ""}
      </div>
      <div>
        {_.some(notes, { status: "loading" }) ? "Loading notes..." : ""}
      </div>
      <div className="mt-4">{allAuthors.length + 1} unique authors</div>
      <div className={cn({ "text-gray-300": isAnyPending })}>
        {_.map(allAuthors, (author) => (
          <div>{author}</div>
        ))}
      </div>
    </div>
  );
}
