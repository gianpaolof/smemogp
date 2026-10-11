import ical from "node-ical";
import type { Adapter, RawEvent } from "../types";

export const icalAdapter: Adapter = {
  extract: async (source, content) => {
    const data = ical.sync.parseICS(content.body);
    const out: RawEvent[] = [];
    for (const item of Object.values(data)) {
      if (!item || item.type !== "VEVENT") continue;
      const summary = typeof item.summary === "string" ? item.summary : item.summary?.val;
      if (!summary || !item.start) continue;
      out.push({
        title: summary,
        startsAt: new Date(item.start),
        endsAt: item.end ? new Date(item.end) : null,
        allDay: item.datetype === "date",
        description: typeof item.description === "string" ? item.description : null,
        venueName: typeof item.location === "string" ? item.location : null,
        address: typeof item.location === "string" ? item.location : null,
        url: typeof item.url === "string" ? item.url : source.url,
      });
    }
    return out;
  },
};
