export type ResponseErrorData = {
  error: string;
  notUnique?: true;
  key: string;
};

export class ResponseError {
  constructor(private error: ResponseErrorData) {}
}
