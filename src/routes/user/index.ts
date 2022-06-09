import { Router } from "express";
import { emailPublicRsaDecrypt } from "../../crypto/index.js";
import { getLaboratories } from "../../db/Lab/index.js";
import {
  getUser,
  getUsers,
  createUser,
  getEmployee,
} from "../../db/User/index.js";
import { AuthRequest, ListenerRequest } from "../../types/Express/index.js";
import { ResponseError } from "../../types/Responses/error.js";
import { normalize } from "../../utils/index.js";
import { authGuard, listenerGuard } from "../middlewares/index.js";

const router = Router();

//router.get("/", async (req, res) => res.send(await getUsers(req.query)));
router.get(["/", "/:lab"], authGuard, async (req: AuthRequest, res) => {
  if (!req.user["sub-lab"])
    return res.status(400).send(
      new ResponseError({
        error: "No lab owner",
        key: "lab",
      })
    );
  req.query.labId = req.user["sub-lab"];
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
      req.user["sub-lab"],
    ].includes(req.params.lab)
  )
    return res.status(400).send(
      new ResponseError({
        error: "Requested lab not in user lab list",
        key: "lab",
      })
    );
  const employee = await getEmployee(
    req.params.lab,
    normalize(req.params.employee)
  );
  if (!employee) res.status(404);
  res.send(employee);
});
router.get("/me", authGuard, async (req: AuthRequest, res) =>
  res.send(await getUser(req.user["sub-user"]))
);
router.get("/:id", async (req, res) => res.send(await getUser(req.params.id)));
router.post("/", async (req, res) => {
  const { name, password, profileImg, inviteHash }: { [key: string]: string } =
    req.body;
  // - Validate body fields
  if (!name || !password || !inviteHash)
    return res
      .status(400)
      .send(new ResponseError({ error: "Invalid body fields", key: "body" }));
  // - Validate valid invitation hash
  const decrypted = emailPublicRsaDecrypt(inviteHash);
  if (!decrypted)
    return res
      .status(400)
      .send(
        new ResponseError({ error: "Invalid invitation", key: "invitehash" })
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
    return res
      .status(410)
      .send(
        new ResponseError({
          error: "The requested invitation already expired.",
          key: "timeout",
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
