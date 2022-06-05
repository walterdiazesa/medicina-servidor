import { normalize } from "../../../utils/index.js";

const randElement = () => {
  const keys = [
    "ALP",
    "CHE",
    "CPK",
    "GGT",
    "GOT",
    "AST",
    "GPT",
    "ALT",
    "LAP",
    "LDH",
    "ALB",
    "BUN",
    "CRE",
    "GLU",
    "NH3",
    "CRP",
    "CA",
    "IP",
    "MG",
    "TG",
    "TP",
    "UA",
    "NA",
    "K",
    "CI",
  ];
  return keys[Math.floor(Math.random() * (keys.length - 1 + 1))].toLowerCase();
};

export const slug = (name: string) => {
  const normalizedName = normalize(name);
  const keys = normalizedName.split(" ");
  return `${keys
    .map((key, idx) => (idx < keys.length - 1 ? key[0] : key))
    .join("")}${keys.length <= 2 ? randElement() : ""}${randElement()}`;
};
