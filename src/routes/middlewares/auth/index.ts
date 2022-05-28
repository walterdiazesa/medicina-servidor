import { Response, NextFunction } from "express";
import { verifyJWT } from "../../../auth/index.js";
import { AuthRequest } from "../../../types/Express/index.js";
import { NoAuth } from "../../Responses/index.js";

// onlyAdmin?: true
export function authGuard(req: AuthRequest, res: Response, next: NextFunction) {
  const token: string | undefined =
    process.env.NODE_ENV.trim() === "DEV"
      ? req.headers.authorization || req.cookies.session
      : req.cookies.session;
  const jwt = verifyJWT(token);
  if (!jwt) {
    if (req.cookies.session)
      res.cookie("session", "", {
        expires: new Date(0),
        httpOnly: true,
        secure: process.env.NODE_ENV.trim() === "PROD",
      });
    return res.status(401).send(NoAuth());
  }
  req.user = jwt;
  next();
}
