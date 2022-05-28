import { Router } from "express";
import { login } from "../../auth/index.js";
import { AuthRequest } from "../../types/Express/index.js";
import { ResponseError } from "../../types/Responses/error.js";
import { authGuard } from "../middlewares/index.js";

const router = Router();

router.post("/", authGuard, (req: AuthRequest, res) => {
  res.status(200).send(req.user);
});

router.post("/login", async (req, res) => {
  const auth = await login(req.body.username, req.body.password);
  if (auth instanceof ResponseError) return res.status(401).send(auth);
  res.cookie("session", auth["access_token"], {
    httpOnly: true,
    secure: process.env.NODE_ENV.trim() === "PROD",
  });
  return res.status(200).send(auth["payload"]);
  /* {
    ...auth["payload"],
    ...(process.env.NODE_ENV.trim() === "DEV" && {
      access_token: auth["access_token"],
    }),
  } */
});

router.post("/logout", async (req, res) => {
  res.cookie("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV.trim() === "PROD",
  });
  return res.status(200).send();
});

export default router;
