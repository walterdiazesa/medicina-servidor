import { Router } from "express";
import { login } from "../../auth/index.js";
import { ResponseError } from "../../types/Responses/error.js";

const router = Router();

router.post("/", async (req, res) => {
  const auth = await login(req.body.username, req.body.password);
  if (auth instanceof ResponseError) return res.status(401).send(auth);
  res.cookie("session", auth["access_token"], { httpOnly: true });
  return res.status(200).send(auth["payload"]);
  /* {
    ...auth["payload"],
    ...(process.env.NODE_ENV.trim() === "DEV" && {
      access_token: auth["access_token"],
    }),
  } */
});

export default router;
