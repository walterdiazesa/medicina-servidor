import { Test } from "@prisma/client";
import { TestCategoryDict } from "../../types/Test";

const testCategories: TestCategoryDict = {
  DRYCHEM: "Química Seca",
  HEMA: "Hematología",
  TCUSTOM: "Pruebas Especiales",
};

export const getTestCategory = (test: Test) => {
  if (!test.category) return testCategories.DRYCHEM; // "Sin categorizar"
  return testCategories[test.category];
};
