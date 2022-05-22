export interface TestItem {
  name: string;
  assign: string; // "=" | "<"
  value: string;
  range?: { item: number; between: { from: number; to: number } };
}

export interface Test {
  labId: string;
  patientId: string;
  sex: string;
  date: Date;
  tests: TestItem[];
}
