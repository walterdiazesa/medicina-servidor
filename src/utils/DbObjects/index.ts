const checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
export const isValidObjectID = (id: number | string | Buffer) => {
  if (id == null) return false;

  if (typeof id === "number") {
    return true;
  }

  if (typeof id === "string") {
    return id.length === 12 || (id.length === 24 && checkForHexRegExp.test(id));
  }

  if (id instanceof Buffer && id.length === 12) {
    return true;
  }

  return false;
};
