import React from "react";
import _ from "lodash";
import { useChannels, useContent } from "../logic/useContent";
import { CSVLink } from "react-csv";

export default function CsvDump() {
  const groupChannels = useChannels();
  const content = useContent(_.keys(groupChannels?.data));

  const contentCsvHeaders = [
    { label: "Channel", key: "channel" },
    { label: "Author", key: "author" },
    { label: "Sent", key: "sent" },
    { label: "Notebook Comments", key: "quips" },
    { label: "Reactions", key: "reactions" },
    { label: "Is Reply?", key: "isReply" },
  ];

  const contentCSV = _.flatten(
    _.map(content, (c: any) => {
      return _.map(c.data, (p) => {
        if (p.quippers) {
          return {
            channel: p.channel,
            author: p.author,
            sent: p.sent.toLocaleString(),
            quips: p.quippers.length,
            reactions: null,
            isReply: null,
          };
        }
        return {
          channel: p.channel,
          author: p.author,
          sent: p.sent.toLocaleString(),
          quips: null,
          reactions: _.keys(p.seal.feels).length,
          isReply: p.replying ? "Yes" : "No",
        };
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
