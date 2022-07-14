import { Router } from "express";
import { signJWT } from "../../auth/index.js";
import { getFileUploadUrl, uploadFile } from "../../aws/s3.js";
import { emailPublicRsaDecrypt } from "../../crypto/index.js";
import { getLaboratories } from "../../db/Lab/index.js";
import {
  getUser,
  getUsers,
  createUser,
  getEmployee,
  updateUser,
} from "../../db/User/index.js";
import { AuthRequest } from "../../types/Express/index.js";
import { ResponseError } from "../../types/Responses/error.js";
import { normalize } from "../../utils/index.js";
import { authGuard } from "../middlewares/index.js";
import fileUpload from "express-fileupload";
import { User } from "@prisma/client";
import { InvalidFormat } from "../Responses/index.js";

const router = Router();

//router.get("/", async (req, res) => res.send(await getUsers(req.query)));
router.get("/me", authGuard, async (req: AuthRequest, res) =>
  res.send(await getUser(req.user["sub-user"], true))
);
router.patch("/me", authGuard, async (req: AuthRequest, res) => {
  if (!req.user["sub-user"])
    return res.status(403).send(
      new ResponseError({
        error: "No user profile for this account",
        key: "role",
      })
    );

  const user = await updateUser(req.user["sub-user"], req.body);

  if (user instanceof ResponseError) res.status(400);
  else
    res.cookie("session", signJWT(req.user), {
      httpOnly: true,
      secure: process.env.NODE_ENV.trim() === "PROD",
      sameSite: process.env.NODE_ENV.trim() === "PROD" ? "none" : undefined,
    });
  res.send(user);
});
router.get(["/", "/:lab"], authGuard, async (req: AuthRequest, res) => {
  if (!req.user["sub-lab"].length)
    return res.status(403).send(
      new ResponseError({
        error: "Not a lab owner",
        key: "role",
      })
    );
  if (!req.params.lab && req.user["sub-lab"].length !== 1)
    return res.status(400).send(
      new ResponseError({
        error: "In case you own many labs, you have to specify an identifier",
        key: "identifier",
      })
    );
  if (req.params.lab && !req.user["sub-lab"].includes(req.params.lab))
    return res.status(403).send(
      new ResponseError({
        error: "Not enough permissions for this action",
        key: "role",
      })
    );
  req.query.labId = req.params.lab || req.user["sub-lab"][0];
  res.send(await getUsers(req.query));
});
router.get("/:lab/:employee", authGuard, async (req: AuthRequest, res) => {
  const authLabs = await getLaboratories(
    { fields: { id: true }, labFromUser: false },
    req.user
  );
  if (
    ![
      ...authLabs.map(({ id }: { id: string }) => id),
      ...req.user["sub-lab"],
    ].includes(req.params.lab)
  )
    return res.status(403).send(
      new ResponseError({
        error: "Not a lab user",
        key: "role",
      })
    );
  const employee = await getEmployee(
    req.params.lab,
    normalize(req.params.employee)
  );
  if (!employee) res.status(404);
  res.send(employee);
});
router.get("/:id", async (req, res) => res.send(await getUser(req.params.id)));
router.post("/", async (req, res) => {
  const { name, password, profileImg, inviteHash }: { [key: string]: string } =
    req.body;
  // - Validate body fields
  if (!name || !password || !inviteHash)
    return res.status(400).send(InvalidFormat("body"));
  // - Validate valid invitation hash
  const decrypted = emailPublicRsaDecrypt(inviteHash);
  if (!decrypted)
    return res
      .status(400)
      .send(
        new ResponseError({ error: "Invalid invitation", key: "invitation" })
      );
  // - Validate expire on invitation payload
  const {
    email,
    expires,
    labId,
  }: {
    email: string;
    expires: number;
    labId: string;
  } = JSON.parse(decrypted);

  if (expires < Date.now())
    return res.status(410).send(
      new ResponseError({
        error: "The requested invitation already expired",
        key: "invitation",
      })
    );

  const user = await createUser({ name, email, password, profileImg, labId });
  if (user instanceof ResponseError) return res.status(400).send(user);
  res.cookie("session", user["access_token"], {
    httpOnly: true,
    secure: process.env.NODE_ENV.trim() === "PROD",
    sameSite: process.env.NODE_ENV.trim() === "PROD" ? "none" : undefined,
  });
  return res.status(201).send(user["user"]);
});

export default router;
