import { Response, NextFunction, Request } from "express";

export function routesGuard(
  corsWhiteList: string[],
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (process.env.NODE_ENV.trim() !== "DEV") {
    console.log(
      "\x1b[34m🔒 routesGuard \x1b[35m(src/routes/middlewares/security/index.ts)\x1b[0m",
      req.path,
      req.method,
      req.headers.origin,
      req.get("origin"),
      req.ip,
      req.headers["access-control-allow-origin"],
      req.rawHeaders
    );
    const isDomainAllowed = corsWhiteList.includes(req.headers.origin);
    const isOperationAllowed = (path: string, method: string) => {
      if (!isDomainAllowed) {
        if (path.startsWith("/test") && ["GET", "PUT"].includes(method))
          return false;
        if (path.startsWith("/auth")) return false;
        if (path.startsWith("/files")) return false;
      }
      return true;
    };
    if (!isOperationAllowed(req.path, req.method)) {
      console.log(
        "\x1b[34m🔒 routesGuard \x1b[35m(src/routes/middlewares/security/index.ts)\x1b[0m",
        req.path,
        req.method,
        req.headers.origin,
        req.get("origin"),
        req.ip,
        req.headers["access-control-allow-origin"],
        req.rawHeaders
      );
    }
    /* return res.status(405).send({
        message: "La petición no fue hecha desde un dominio autorizado.",
      }); */
  }
  next();
}
