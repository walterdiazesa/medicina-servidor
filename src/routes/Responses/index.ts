import { ResponseError } from "../../types/Responses/error.js";

export const NotUnique = (type: string) =>
  new ResponseError({
    error: `Conflict in key "${type}"`,
    notUnique: true,
    key: type,
  });

export const NoAuth = (onlyAdmin?: true) =>
  new ResponseError({
    error: `Unauthorized operation`,
    key: onlyAdmin ? "admin" : "auth",
  });
