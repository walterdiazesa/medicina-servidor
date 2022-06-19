import { Router } from "express";
import { emailPublicRsaDecrypt } from "../../crypto/index.js";
import { prisma } from "../../db/handler.js";
import {
  getTests,
  createTest,
  getTest,
  getTestAccess,
  deleteTest,
  updateTest,
  createChemTest,
  requestValidation,
  validateTest,
} from "../../db/Test/index.js";
import { AuthRequest, ListenerRequest } from "../../types/Express/index.js";
import { ResponseError } from "../../types/Responses/error.js";
import { isValidObjectID } from "../../utils/index.js";
import { authGuard, listenerGuard } from "../middlewares/index.js";
import { NotFound } from "../Responses/index.js";
import {
  onTestAlreadyValidated,
  onTestPageRevalidation,
  onTestValidateError,
  onTestValidateSuccess,
  onTestValidation,
  onTestValidationLoading,
} from "./Templates/validation.js";

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
  if (isDeleted instanceof ResponseError) res.status(403);
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

//#region ChemTest
router.post("/chem/", listenerGuard, async (req: ListenerRequest, res) => {
  const chemTest = await createChemTest(req.body, req.listener);
  res.status(201).send(chemTest);
});
//#endregion

router.patch("/:id", authGuard, async (req: AuthRequest, res) => {
  if (!isValidObjectID(req.params.id))
    return res.status(404).send(NotFound("id"));
  const test = await updateTest(req.params.id, req.body, req.user);
  if (test instanceof ResponseError) res.status(401);
  res.send(test);
});
router.put(
  "/validation/request/:id/:validator",
  authGuard,
  async (req: AuthRequest, res) => {
    if (!isValidObjectID(req.params.id))
      return res.status(404).send(NotFound("id"));
    if (!isValidObjectID(req.params.validator))
      return res.status(400).send(
        new ResponseError({
          error: "Invalid validator id",
          key: "validatorid",
        })
      );
    const test = await requestValidation(
      req.user,
      req.params.validator,
      req.params.id
    );
    if (test instanceof ResponseError) res.status(400);
    res.send(test);
  }
);
router.get("/validation/submit/:hash", async (req: AuthRequest, res) => {
  const decrypted = emailPublicRsaDecrypt(req.params.hash);

  res.setHeader("Content-Type", "text/html");
  res.write(onTestValidation());

  /* new ResponseError({
    error: "Invalid validation hash",
    key: "validationhash",
  }); */
  if (!decrypted)
    return (
      res
        .status(400)
        .write(onTestValidateError("Hash de validación inválido.")) && res.end()
    );
  // - Validate expire on validation payload
  const {
    validatorId,
    testId,
    expires,
  }: {
    validatorId: string;
    expires: number;
    testId: string;
  } = JSON.parse(decrypted);

  /* new ResponseError({
    error: "The requested validation already expired.",
    key: "timeout",
  }); */
  if (expires < Date.now())
    return (
      res
        .status(410)
        .write(
          onTestValidateError("La petición para validar el test ya expiró.")
        ) && res.end()
    );

  const { validatorId: isAlreadyValidated } = await prisma.test.findUnique({
    where: { id: testId },
    select: { validatorId: true },
  });
  if (!!isAlreadyValidated)
    return res.write(onTestAlreadyValidated(testId)) && res.end();

  res.write(onTestValidationLoading());
  const validateResponse = await validateTest(testId, validatorId);

  if (validateResponse instanceof ResponseError)
    return (
      res
        .status(500)
        .write(onTestValidateError(JSON.stringify(validateResponse))) &&
      res.end()
    );

  res.write(onTestPageRevalidation(testId));

  await validateResponse();

  res.write(onTestValidateSuccess(testId));
  res.end();
});

export default router;
