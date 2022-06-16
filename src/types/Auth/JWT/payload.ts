export type Payload = {
  "sub-user"?: string;
  "sub-lab"?: string;
  iat: number;
  exp: number;
  iss: "medicina-servidor";
  sub: string;
  img: string;
} & (
  | { "sub-user": string; "sub-lab": string }
  | { "sub-lab": string }
  | { "sub-user": string }
);

export type ListenerPayload = { labId: string; ip: string };
