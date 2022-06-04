import { Router } from "express";
import { getPatient } from "../../db/Patient/index.js";
import { authGuard } from "../middlewares/index.js";

const router = Router();

router.get(["/", "/:patient"], authGuard, async (req, res) => {
  const patient = await getPatient(req.params.patient);
  if (!patient) res.status(404);
  res.send(patient);
});

export default router;
