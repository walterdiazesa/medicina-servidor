import { Router } from "express";
import { getUser, getUsers, createUser } from "../../db/User/index.js";
import { AuthRequest } from "../../types/Express/index.js";
import { ResponseError } from "../../types/Responses/error.js";
import { authGuard } from "../middlewares/index.js";

const router = Router();

router.get("/", async (req, res) => res.send(await getUsers(req.query)));
router.get("/me", authGuard, async (req: AuthRequest, res) =>
  res.send(await getUser(req.user["sub-user"]))
);
router.get("/:id", async (req, res) => res.send(await getUser(req.params.id)));
router.post("/", async (req, res) => {
  const user = await createUser(req.body);
  if (user instanceof ResponseError) return res.status(400).send(user);
  res.cookie("session", user["access_token"], { httpOnly: true });
  return res.status(201).send(user["user"]);
});

export default router;
