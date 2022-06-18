export type Payload = {
  "sub-user"?: string;
  "sub-lab": string[];
  iat: number;
  exp: number;
  iss: "medicina-servidor";
  sub: string;
  img: string;
};

export type ListenerPayload = { labId: string; ip: string };
