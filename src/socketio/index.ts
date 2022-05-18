import { Server } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { getActiveIO } from "../index.js";
import { EventType } from "../types/io_events.js";

export const emit = (event: EventType, ...args: any[]) => {
  getActiveIO().io.emit(event, args);
};
