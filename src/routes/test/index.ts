import { Router } from "express";
import {
  getTests,
  createTest,
  getTest,
  getTestAccess,
} from "../../db/Test/index.js";
import { AuthRequest, ListenerRequest } from "../../types/Express/index.js";
import { ResponseError } from "../../types/Responses/error.js";
import { authGuard, listenerGuard } from "../middlewares/index.js";

const router = Router();

router.get("/", authGuard, async (req: AuthRequest, res) => {
  res.send(await getTests(req.query, req.user));
});
router.get("/:id", async (req, res) => res.send(await getTest(req.params.id)));
router.get("/:id/access", authGuard, async (req: AuthRequest, res) =>
  res.send(await getTestAccess(req.params.id, req.user))
);
router.post("/", listenerGuard, async (req: ListenerRequest, res) => {
  if (!req.body.chemData)
    return res.status(400).send(
      new ResponseError({
        error: "Required chemData in body",
        key: "chemdata",
      })
    );
  // issuer, patient & username not required... for now
  console.log(req.body);
  return res.status(201).send({ very: "Good" });
  const test = await createTest(req.body, req.listener);
  if (test instanceof ResponseError) res.status(400);
  else res.status(201);
  res.send(test);
});

export default router;
