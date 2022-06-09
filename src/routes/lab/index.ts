import { Router } from "express";
import {
  getLaboratory,
  getLaboratories,
  createLaboratory,
  upsertOwner,
  removeUser,
  inviteUser,
} from "../../db/Lab/index.js";
import { AuthRequest } from "../../types/Express/index.js";
import { ResponseError } from "../../types/Responses/error.js";
import { authGuard } from "../middlewares/index.js";

const router = Router();

router.get("/", authGuard, async (req: AuthRequest, res) =>
  res.send(await getLaboratories(req.query, req.user))
);
router.get("/:id", async (req, res) =>
  res.send(await getLaboratory(req.params.id))
);
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

router.patch("/owners", authGuard, async (req: AuthRequest, res) => {
  const { labId, owner, type }: { [key: string]: string } = req.body;
  if (!labId || !owner || !type || !["ADD", "REMOVE"].includes(type))
    return res
      .status(400)
      .send(new ResponseError({ error: "Invalid body format", key: "format" }));
  if (!req.user["sub-lab"] || req.user["sub-lab"] !== labId)
    return res
      .status(400)
      .send(new ResponseError({ error: "Not enough privileges", key: "role" }));
  return res.send(await upsertOwner(owner, labId, type as "ADD" | "REMOVE"));
});
router.patch("/users", authGuard, async (req: AuthRequest, res) => {
  const { labId, user, type }: { [key: string]: string } = req.body;
  if (!labId || !user)
    return res
      .status(400)
      .send(new ResponseError({ error: "Invalid body format", key: "format" }));
  if (!req.user["sub-lab"] || req.user["sub-lab"] !== labId)
    return res
      .status(400)
      .send(new ResponseError({ error: "Not enough privileges", key: "role" }));
  if (type === "INVITE") {
    const response = await inviteUser(user, labId);
    if (response instanceof ResponseError) res.status(400);
    return res.send(response);
  }
  return res.send(await removeUser(user, labId));
});

export default router;
