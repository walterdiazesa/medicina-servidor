import { Prisma, Test } from "@prisma/client";
import { TestItem } from "../types/Test";

// TO-DO: Implement a global chem identifier
const isChem = (chemData: string) => true;

type ChemClass = "NX500";

// TO-DO: Implement a global chem classifier
const getChemClass = (chemData: string): ChemClass => "NX500";

const parseChemNX500 = (chemData: string) => {
  const Test: Partial<Test> = {};
  const text = chemData.replace(/\s/g, "");
  const parseText = text.split(",");
  const cantidadPruebas = parseInt(parseText[11]);
  Test.category = "DRYCHEM";
  const testJson: TestItem[] = [];
  for (let i = 12; i < 12 + cantidadPruebas * 6; i += 7) {
    const boolTestJson =
      parseInt(parseText[i + 3]) === 1 &&
      parseInt(parseText[i + 4]) === 0 &&
      parseInt(parseText[i + 5]) === 0;
    testJson.push({
      name: parseText[i],
      assign: parseText[i + 1],
      value: parseText[i + 2],
      ...(!boolTestJson && {
        range: {
          item: parseInt(parseText[i + 3]),
          between: {
            from: parseInt(parseText[i + 4]),
            to: parseInt(parseText[i + 5]),
          },
        },
      }),
    });
  }
  Test["tests"] = testJson as unknown as Prisma.JsonValue;
  return Test as Test;
};

export const parseChem = (chemData: string): Test | null => {
  if (!isChem(chemData)) return null;
  switch (getChemClass(chemData)) {
    case "NX500":
      return parseChemNX500(chemData);
  }
};
