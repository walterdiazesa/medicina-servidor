import { Response, NextFunction, Request } from "express";

export function routesGuard(
  corsWhiteList: string[],
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (process.env.NODE_ENV.trim() !== "DEV" && false) {
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
    if (!isOperationAllowed(req.path, req.method))
      return res.status(405).send({
        message: "La petición no fue hecha desde un dominio autorizado.",
      });
  }
  next();
}
