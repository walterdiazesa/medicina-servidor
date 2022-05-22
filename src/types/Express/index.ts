import { Request } from "express";
import { Payload } from "../Auth/index.js";

export interface AuthRequest extends Request {
  user: Payload;
}
