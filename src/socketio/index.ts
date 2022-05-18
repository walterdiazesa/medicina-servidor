import { io } from "../index.js";
import { EventType } from "../types/io_events.js";

export const emit = (event: EventType, ...args: any[]) => {
  io.emit(event, args);
};
