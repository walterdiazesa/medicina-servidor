type Event = "test" | "installer";
type Type = "created";

export type EventType = `${Event}_${Type}`;
