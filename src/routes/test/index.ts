import { Router } from "express";
import {
  getTests,
  createTest,
  getTest,
  getTestAccess,
} from "../../db/Test/index.js";
import { AuthRequest } from "../../types/Express/index.js";
import { authGuard } from "../middlewares/index.js";

const router = Router();

router.get("/", authGuard, async (req: AuthRequest, res) =>
  res.send(await getTests(req.query, req.user))
);
router.get("/:id", async (req, res) => res.send(await getTest(req.params.id)));
router.get("/:id/access", authGuard, async (req: AuthRequest, res) =>
  res.send(await getTestAccess(req.params.id, req.user))
);
router.post("/", async (req, res) =>
  res.send(await createTest({ ...req.body, date: new Date() }))
);

export default router;
