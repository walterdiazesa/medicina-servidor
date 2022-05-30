import { Router } from "express";
import {
  getLaboratory,
  getLaboratories,
  createLaboratory,
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

export default router;
