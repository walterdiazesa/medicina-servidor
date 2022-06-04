import { Router } from "express";
import {
  getTests,
  createTest,
  getTest,
  getTestAccess,
  deleteTest,
  updateTest,
} from "../../db/Test/index.js";
import { AuthRequest, ListenerRequest } from "../../types/Express/index.js";
import { ResponseError } from "../../types/Responses/error.js";
import { isValidObjectID } from "../../utils/index.js";
import { authGuard, listenerGuard } from "../middlewares/index.js";
import { NotFound } from "../Responses/index.js";

const router = Router();

router.get("/", authGuard, async (req: AuthRequest, res) => {
  res.send(await getTests(req.query, req.user));
});
router.get("/:id", async (req, res) => res.send(await getTest(req.params.id)));
router.get("/:id/access", authGuard, async (req: AuthRequest, res) =>
  res.send(await getTestAccess(req.params.id, req.user))
);
router.delete("/:id", authGuard, async (req: AuthRequest, res) => {
  const isDeleted = await deleteTest(req.params.id, req.user);
  if (isDeleted instanceof ResponseError) res.status(401);
  res.send(isDeleted);
});
router.post("/", listenerGuard, async (req: ListenerRequest, res) => {
  if (!req.body.chemData)
    return res.status(400).send(
      new ResponseError({
        error: "Required chemData in body",
        key: "chemdata",
      })
    );
  const test = await createTest(req.body, req.listener);
  if (test instanceof ResponseError) res.status(400);
  else res.status(201);
  res.send(test);
});
router.patch("/:id", authGuard, async (req: AuthRequest, res) => {
  if (!isValidObjectID(req.params.id))
    return res.status(404).send(NotFound("id"));
  const test = await updateTest(req.params.id, req.body, req.user);
  if (test instanceof ResponseError) res.status(401);
  res.send(test);
});

export default router;
