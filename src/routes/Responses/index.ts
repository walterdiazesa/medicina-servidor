import {
  ResponseError,
  ResponseErrorDataKey,
} from "../../types/Responses/error.js";

export const NotUnique = (type: ResponseErrorDataKey) =>
  new ResponseError({
    error: `Conflict in key __${type}`,
    notUnique: true,
    key: type,
  });

export const NoAuth = (onlyAdmin?: true) =>
  new ResponseError({
    error: `Unauthorized operation`,
    key: onlyAdmin ? "admin" : "auth",
  });

export const NotFound = (key: ResponseErrorDataKey) =>
  new ResponseError({ error: "Not found", key });

export const InvalidFormat = (key: string) =>
  new ResponseError({ error: `Invalid field __"${key}"`, key: "format" });

export const NotEditable = (key: string) =>
  new ResponseError({
    error: `Cannot update a __${key}__ after being setted`,
    key: "operation",
  });
