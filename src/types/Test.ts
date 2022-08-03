export interface TestItem {
  name: string;
  assign: string; // "=" | "<"
  value: string;
  range?: { item: number; between: { from: number; to: number } };
}

export interface Test {
  id: string;
  customId: number;
  tests: TestItem[];
  remark: { text: string; by: string } | null;
  date: Date;
  category: TestCategory;
  validated: Date | null;
  labId: string;
  issuerId: string | null;
  validatorId: string | null;
  patientId: string | null;
  isDeleted: boolean;
}

export const TestCategory = {
  DRYCHEM: "DRYCHEM",
  TCUSTOM: "TCUSTOM",
  HEMA: "HEMA",
} as const;

export type TestCategory = typeof TestCategory[keyof typeof TestCategory];

export type TestCategoryDict = {
  [key in TestCategory]: string;
};
