import { NextFunction, Request, Response } from "express";

const parseBoolFromString = (string: string) => {
  switch (string) {
    case "true":
      return true;
    case "false":
      return false;
    default:
      return string;
  }
};

const parseValue = (value: any) => {
  if (typeof value === "string") {
    return parseBoolFromString(value);
  } else if (value.constructor === Object) {
    return parseObject(value);
  } else if (Array.isArray(value)) {
    const array: any = [];
    value.forEach(function (item, itemKey) {
      array[itemKey] = parseValue(item);
    });
    return array;
  } else {
    return value;
  }
};

const parseObject = (obj: any) => {
  const query: any = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      query[key] = parseValue(obj[key]);
    }
  }

  return query;
};

export function parseQueryBoolean() {
  return function (req: Request, res: Response, next: NextFunction) {
    req.query = parseObject(req.query);
    next();
  };
}
