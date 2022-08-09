import { Response, NextFunction, Request } from "express";
import { isValidEmail } from "../../../utils/Email/validations.js";
import { isName, isValidObjectID } from "../../../utils/index.js";
import { InvalidFormat } from "../../Responses/index.js";

export async function validationGuard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (Object.keys(req.body).length) {
    res.status(400);
    //#region email
    if (
      "email" in req.body &&
      (!req.body.email?.trim() || !(await isValidEmail(req.body.email, true)))
    )
      return res.send(InvalidFormat("email"));
    //#endregion

    //#region password
    if ("password" in req.body && !req.body.password?.trim())
      return res.send(InvalidFormat("password"));
    if (
      "oldPassword" in req.body &&
      (!req.body.oldPassword?.trim() || !("newPassword" in req.body))
    )
      return res.send(InvalidFormat("password (old)"));
    if (
      "newPassword" in req.body &&
      (!req.body.newPassword?.trim() || !("oldPassword" in req.body))
    )
      return res.send(InvalidFormat("password (new)"));
    //#endregion

    //#region username
    if ("username" in req.body && !req.body.username?.trim())
      return res.send(InvalidFormat("username"));
    //#endregion

    //#region uniques
    if (
      "name" in req.body &&
      (!req.body.name?.trim() || !isName(req.body.name))
    )
      return res.send(InvalidFormat("name"));
    if ("dui" in req.body && !req.body.dui?.trim())
      return res.send(InvalidFormat("dui"));
    if ("phone" in req.body && !req.body.phone?.trim())
      return res.send(InvalidFormat("phone"));
    //#endregion

    //#region dates
    if (
      "dateBorn" in req.body &&
      !(req.body.dateBorn instanceof Date) &&
      Object.prototype.toString.call(req.body.dateBorn) !== "[object Date]" &&
      isNaN(Date.parse(req.body.dateBorn))
    )
      return res.send(InvalidFormat("date"));
    //#endregion

    res.status(200);
  }

  next();
}
