export * from "./DbObjects/index.js";
export * from "./String/index.js";
export * from "./Test/index.js";

export const isNumber = (n: any) => {
  if (!n || !String(n).trim() || +n !== +n) return false;
  return true;
};
export const isInteger = (n: any) => {
  if (!isNumber(n) || !Number.isInteger(+n)) return false;
  return true;
};
