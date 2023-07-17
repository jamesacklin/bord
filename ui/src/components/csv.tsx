import React from "react";
import _ from "lodash";
import { useChannels, useContent } from "../logic/useContent";
import { CSVLink } from "react-csv";

function getCount(str: string) {
  return str.trim().split(/\s+/).length;
}

export default function CsvDump() {
  const groupChannels = useChannels();
  const content = useContent(_.keys(groupChannels?.data));

  const contentCsvHeaders = [
    { label: "Channel", key: "channel" },
    { label: "Author", key: "author" },
    { label: "Date", key: "date" },
    { label: "Time", key: "time" },
    { label: "Words", key: "words" },
    { label: "Notebook Comments", key: "quips" },
    { label: "Reactions", key: "reactions" },
    { label: "Is Reply?", key: "isReply" },
  ];

  const contentCSV = _.flatten(
    _.map(content, (c: any) => {
      return _.map(c.data, (p) => {
        if (p.channel.startsWith("chat")) {
          return {
            channel: p.channel,
            author: p.author,
            date: p.sent.toLocaleDateString(),
            time: p.sent.toLocaleTimeString(),
            quips: null,
            words: getCount(p.content.story.inline.join(" ")),
            reactions: _.keys(p.seal.feels).length,
            isReply: p.replying ? "Yes" : "No",
          };
        } else if (p.channel.startsWith("heap")) {
          return {
            channel: p.channel,
            author: p.author,
            date: p.sent.toLocaleDateString(),
            time: p.sent.toLocaleTimeString(),
            quips: null,
            words: getCount(p.content.inline.join(" ")),
            reactions: _.keys(p.seal.feels).length,
            isReply: p.replying ? "Yes" : "No",
          };
        } else if (p.channel.startsWith("diary")) {
          return {
            channel: p.channel,
            author: p.author,
            date: p.sent.toLocaleDateString(),
            time: p.sent.toLocaleTimeString(),
            quips: _.keys(p.seal.quips).length,
            words: getCount(_.map(p.content, (c) => c.inline).join(" ")),
            reactions: _.keys(p.seal.feels).length,
            isReply: null,
          };
        } else {
          return {
            channel: p.channel,
            author: p.author,
            date: p.sent.toLocaleDateString(),
            time: p.sent.toLocaleTimeString(),
            quips: null,
            words: null,
            reactions: null,
            isReply: null,
          };
        }
      });
    })
  );

  const isLoading = content.some((c) => c.status === "pending");
  const numberLoading = content.filter((c) => c.status === "success").length;

  return (
    <div>
      {isLoading ? (
        <div>
          Loading content from {numberLoading} of {_.keys(groupChannels).length}{" "}
          channels...
        </div>
      ) : (
        <CSVLink data={contentCSV} headers={contentCsvHeaders}>
          <div className="button">Download CSV</div>
        </CSVLink>
      )}
    </div>
  );
}
