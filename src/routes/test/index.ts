import { Router } from "express";
import { getTests, createTest } from "../../db/Test/index.js";

const router = Router();

router.get("/", async (req, res) => res.send(await getTests()));
router.post("/", async (req, res) => res.send(await createTest(req.body)));

export default router;
