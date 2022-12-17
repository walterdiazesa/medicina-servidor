import { Response, NextFunction, Request } from "express";

export function routesGuard(
  corsWhiteList: string[],
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (process.env.NODE_ENV.trim() !== "DEV") {
    const isDomainAllowed = corsWhiteList.includes(req.headers.origin);
    const UserAgentAllowed = [
      "https://github.com/sindresorhus/got",
      "Vercelbot",
      "axios/0.27.2",
    ];
    const isOperationAllowed = (path: string, method: string) => {
      if (!isDomainAllowed) {
        if (path.startsWith("/test") && ["GET", "PUT"].includes(method))
          return false;
        if (path.startsWith("/auth")) return false;
        if (path.startsWith("/files")) return false;
      }
      return true;
    };
    if (
      !isOperationAllowed(req.path, req.method) &&
      !UserAgentAllowed.some((agent) =>
        (req.headers["user-agent"] || "").includes(agent)
      )
    ) {
      console.log(
        "\x1b[34m❌🔒 routesGuard \x1b[35m(src/routes/middlewares/security/index.ts)\x1b[0m",
        `\x1b[33m${req.method} \x1b[0m${req.path}\n`,
        `\x1b[36mOrigin: \x1b[0m${req.headers.origin}\n`,
        `\x1b[36mIP: \x1b[0m${req.headers["x-forwarded-for"]}\n`,
        `\x1b[36mUser-Agent: \x1b[0m${req.headers["user-agent"]}\n`,
        req.rawHeaders
      );
      return res.status(405).send({
        message: "La petición no fue hecha desde un dominio autorizado.",
      });
    }
  }
  next();
}
