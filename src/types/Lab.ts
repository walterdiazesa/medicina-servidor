export type Lab = {
  id: string;
  email: string;
  hash: string;
  name: string;
  phone: string;
  address: string;
  publicPhone: string;
  web: string | null;
  publicEmail: string;
  img: string;
  signature: string | null;
  stamp: string | null;
  installer: string | null;
  rsaPrivateKey: string;
  preferences: LabPreferences;
  createdAt: Date;
  userIds: string[];
  ownerIds: string[];
};

export type LabPreferences = {
  useTestCustomId: boolean;
  leadingZerosWhenCustomId: number;
  customIdStartFrom?: number;
  useQR: boolean;
};

export type SignatureItem = {
  name: string;
  data: Buffer;
  mimetype: string;
};
