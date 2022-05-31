import { Router } from "express";
import {
  getUser,
  getUsers,
  createUser,
  getEmployee,
} from "../../db/User/index.js";
import { AuthRequest, ListenerRequest } from "../../types/Express/index.js";
import { ResponseError } from "../../types/Responses/error.js";
import { authGuard, listenerGuard } from "../middlewares/index.js";

const router = Router();

router.get("/", async (req, res) => res.send(await getUsers(req.query)));
router.get(
  "/listener/:employee",
  listenerGuard,
  async (req: ListenerRequest, res) => {
    const employee = await getEmployee(req.listener.labId, req.params.employee);
    if (!employee) res.status(404);
    res.send(employee);
  }
);
router.get("/me", authGuard, async (req: AuthRequest, res) =>
  res.send(await getUser(req.user["sub-user"]))
);
router.get("/:id", async (req, res) => res.send(await getUser(req.params.id)));
router.post("/", async (req, res) => {
  const user = await createUser(req.body);
  if (user instanceof ResponseError) return res.status(400).send(user);
  res.cookie("session", user["access_token"], {
    httpOnly: true,
    secure: process.env.NODE_ENV.trim() === "PROD",
    sameSite: process.env.NODE_ENV.trim() === "PROD" ? "none" : undefined,
  });
  return res.status(201).send(user["user"]);
});

export default router;
