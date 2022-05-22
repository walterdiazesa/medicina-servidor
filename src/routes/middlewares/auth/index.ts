import { Request, Response, NextFunction } from "express";
import { verifyJWT } from "../../../auth/index.js";
import { Payload } from "../../../types/Auth/index.js";
import { AuthRequest } from "../../../types/Express/index.js";
import { NoAuth } from "../../Responses/index.js";

// onlyAdmin?: true
export function authGuard(req: AuthRequest, res: Response, next: NextFunction) {
  const token: string | undefined =
    process.env.NODE_ENV.trim() === "DEV"
      ? req.headers.authorization || req.cookies.session
      : req.cookies.session;
  const jwt = verifyJWT(token);
  if (!jwt) return res.status(401).send(NoAuth());
  req.user = jwt;
  next();
}
