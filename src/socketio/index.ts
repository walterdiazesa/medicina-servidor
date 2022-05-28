import { Server } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { getActiveIO } from "../index.js";
import { EventType } from "../types/io_events.js";

export const emit = (
  { event, to }: { event: EventType; to?: string | string[] },
  ...args: any[]
) => {
  if (!to) return getActiveIO().io.emit(event, args);
  getActiveIO().io.to(to).emit(event, args);
};
