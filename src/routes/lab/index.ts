import { Router } from "express";
import { signJWT } from "../../auth/index.js";
import {
  getLaboratory,
  getLaboratories,
  createLaboratory,
  upsertOwner,
  removeUser,
  inviteUser,
  updateLab,
  updateSignatures,
} from "../../db/Lab/index.js";
import { AuthRequest } from "../../types/Express/index.js";
import { ResponseError } from "../../types/Responses/error.js";
import { isValidObjectID } from "../../utils/index.js";
import { authGuard } from "../middlewares/index.js";
import { qrAccess, qrVerify } from "../../crypto/index.js";
import { InvalidFormat } from "../Responses/index.js";
import fileUpload from "express-fileupload";
import { Lab } from "@prisma/client";
import { SignatureItem } from "../../types/Lab.js";

const router = Router();

router.get("/", authGuard, async (req: AuthRequest, res) =>
  res.send(await getLaboratories(req.query, req.user))
);
router.get(["/mine", "/mine/:id"], authGuard, async (req: AuthRequest, res) => {
  /* if (!req.user["sub-lab"].length)
    return res
      .status(403)
      .send(new ResponseError({ error: "Not a lab user", key: "role" })); */
  if (!req.params.id)
    return res.send(
      await getLaboratory(
        req.user["sub-lab"],
        Boolean(req.query.completeLabInfo)
      )
    );
  /* if (!req.user["sub-lab"].includes(req.params.id))
    return res
      .status(403)
      .send(
        new ResponseError({ error: "Not a user from this lab", key: "role" })
      ); */
  res.send(
    await getLaboratory(
      [req.params.id],
      false,
      req.query.fields as any,
      req.user["sub-lab"].includes(req.params.id) ? undefined : req.user
    )
  );
});
router.get("/mine/:id/:access/:test", async (req: AuthRequest, res) => {
  if (
    !req.params.access ||
    !req.params.test ||
    !(await qrVerify(req.params.access, req.params.test))
  )
    return res
      .status(403)
      .send(
        new ResponseError({ error: "Not a valid access hash", key: "hash" })
      );
  res.send(
    await getLaboratory([req.params.id], false, req.query.fields as any)
  );
});
router.get("/:id", async (req, res) =>
  res.send(await getLaboratory([req.params.id]))
);
router.patch("/owners", authGuard, async (req: AuthRequest, res) => {
  const { labId, owner, type }: { [key: string]: string } = req.body;
  if (!labId || !owner || !type || !["ADD", "REMOVE"].includes(type))
    return res.status(400).send(InvalidFormat("body"));
  if (!req.user["sub-lab"].length || !req.user["sub-lab"].includes(labId))
    return res.status(403).send(
      new ResponseError({
        error: "Not enough permissions for this action",
        key: "role",
      })
    );
  return res.send(await upsertOwner(owner, labId, type as "ADD" | "REMOVE"));
});
router.patch("/users", authGuard, async (req: AuthRequest, res) => {
  const { labId, user, type }: { [key: string]: string } = req.body;
  if (!labId || !user) return res.status(400).send(InvalidFormat("body"));
  if (!req.user["sub-lab"].length || !req.user["sub-lab"].includes(labId))
    return res.status(403).send(
      new ResponseError({
        error: "Not enough permissions for this action",
        key: "role",
      })
    );
  if (type === "INVITE") {
    const response = await inviteUser(user, labId);
    if (response instanceof ResponseError) res.status(400);
    return res.send(response);
  }
  return res.send(await removeUser(user, labId));
});
router.patch("/:id", authGuard, fileUpload(), async (req: AuthRequest, res) => {
  if (!isValidObjectID(req.params.id))
    return res.status(400).send(InvalidFormat("lab id"));
  if (!req.user["sub-lab"].length)
    return res
      .status(403)
      .send(new ResponseError({ error: "Not a lab user", key: "role" }));
  if (!req.user["sub-lab"].includes(req.params.id))
    return res.status(403).send(
      new ResponseError({
        error: "Not enough permissions for this action",
        key: "role",
      })
    );
  let lab: false | ResponseError | Partial<Lab>;
  if (!req.headers["content-type"].includes("multipart/form-data"))
    lab = await updateLab(req.params.id, req.body);
  else {
    if (!req.files || (!req.files.signature && !req.files.stamp))
      return res.status(400).send(
        new ResponseError({
          error:
            "Invalid operation, fields needed when using multipart/form-data",
          key: "format",
        })
      );

    const signatures: { signature?: SignatureItem; stamp?: SignatureItem } = {};
    if (req.files.signature)
      signatures["signature"] = {
        name: `${req.params.id}-signature.${
          (req.files!.signature as fileUpload.UploadedFile).name
            .split(".")
            .reverse()[0]
        }`,
        data: (req.files!.signature as fileUpload.UploadedFile).data,
        mimetype: (req.files!.signature as fileUpload.UploadedFile).mimetype,
      };
    if (req.files.stamp)
      signatures["stamp"] = {
        name: `${req.params.id}-stamp.${
          (req.files!.stamp as fileUpload.UploadedFile).name
            .split(".")
            .reverse()[0]
        }`,
        data: (req.files!.stamp as fileUpload.UploadedFile).data,
        mimetype: (req.files!.stamp as fileUpload.UploadedFile).mimetype,
      };
    lab = await updateSignatures(req.params.id, signatures);
  }
  if (lab instanceof ResponseError) res.status(400);
  else if (lab && req.user["sub-lab"].length === 1)
    res.cookie(
      "session",
      signJWT({ ...req.user, ...(lab.img && { img: lab.img }) }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV.trim() === "PROD",
        sameSite: process.env.NODE_ENV.trim() === "PROD" ? "none" : undefined,
      }
    );
  res.send(lab);
});
router.post("/", async (req, res) => {
  const lab = await createLaboratory(req.body);
  if (lab instanceof ResponseError) return res.status(400).send(lab);
  res.cookie("session", lab["access_token"], {
    httpOnly: true,
    secure: process.env.NODE_ENV.trim() === "PROD",
    sameSite: process.env.NODE_ENV.trim() === "PROD" ? "none" : undefined,
  });
  return res.status(201).send(lab["lab"]);
});

export default router;
