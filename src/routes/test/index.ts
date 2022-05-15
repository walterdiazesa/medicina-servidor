import { Router } from "express";
import { getTests, createTest, getTest } from "../../db/Test/index.js";

const router = Router();

router.get("/", async (req, res) => res.send(await getTests(req.query)));
router.get("/:id", async (req, res) => res.send(await getTest(req.params.id)));
router.post("/", async (req, res) =>
  res.send(await createTest({ ...req.body, date: new Date() }))
);

export default router;
