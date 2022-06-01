import { Router } from "express";
import { getPatient } from "../../db/Patient/index.js";
import { ListenerRequest } from "../../types/Express/index.js";
import { listenerGuard } from "../middlewares/index.js";

const router = Router();

router.get(
  "/listener/:patient",
  listenerGuard,
  async (req: ListenerRequest, res) => {
    const patient = await getPatient(req.params.patient);
    if (!patient) res.status(404);
    res.send(patient);
  }
);

export default router;
