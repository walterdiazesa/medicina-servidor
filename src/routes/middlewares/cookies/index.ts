import { Request, Response, NextFunction } from "express";

export function cookieParser(req: Request, res: Response, next: NextFunction) {
  var cookies = req.headers.cookie;
  if (cookies) {
    req.cookies = cookies
      .split(";")
      .reduce((obj: { [key: string]: any }, c) => {
        var n = c.split("=");
        obj[n[0].trim()] = n[1].trim();
        return obj;
      }, {});
  } else req.cookies = {};
  next();
}
