import { Router } from "express";
import { createPatient, getPatient } from "../../db/Patient/index.js";
import { ResponseError } from "../../types/Responses/error.js";
import { normalize } from "../../utils/index.js";
import { authGuard } from "../middlewares/index.js";

const router = Router();

router.get(["/", "/:patient"], authGuard, async (req, res) => {
  const patient = await getPatient(normalize(req.params.patient));
  if (!patient) res.status(404);
  res.send(patient);
});

router.post("/", authGuard, async (req, res) => {
  const patient = await createPatient(req.body);
  if (patient instanceof ResponseError) res.status(400);
  else res.status(201);
  res.send(patient);
});

export default router;
