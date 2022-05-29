import { Request } from "express";
import { Payload, ListenerPayload } from "../Auth/index.js";

export interface AuthRequest extends Request {
  user: Payload;
}

export interface ListenerRequest extends Request {
  listener: ListenerPayload;
}
