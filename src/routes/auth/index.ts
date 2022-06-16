import { Router } from "express";
import { changePassword, login } from "../../auth/index.js";
import { AuthRequest } from "../../types/Express/index.js";
import { ResponseError } from "../../types/Responses/error.js";
import { authGuard } from "../middlewares/index.js";

const router = Router();

router.post("/", authGuard, (req: AuthRequest, res) => {
  res.status(200).send(req.user);
});

router.patch("/password/change", authGuard, async (req: AuthRequest, res) => {
  const response = await changePassword(
    req.user["sub"],
    req.body.newPassword,
    req.body.oldPassword
  );
  if (response instanceof ResponseError) res.status(400);
  res.send(response);
});

router.post("/login", async (req, res) => {
  const auth = await login(req.body.username, req.body.password);
  if (auth instanceof ResponseError) return res.status(401).send(auth);
  res.cookie("session", auth["access_token"], {
    httpOnly: true,
    secure: process.env.NODE_ENV.trim() === "PROD",
    sameSite: process.env.NODE_ENV.trim() === "PROD" ? "none" : undefined,
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
    sameSite: process.env.NODE_ENV.trim() === "PROD" ? "none" : undefined,
    expires: new Date(0),
  });
  return res.status(200).send();
});

export default router;
