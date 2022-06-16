import { Router } from "express";
import { getFileUploadUrl } from "../../aws/s3.js";

const EXPIRE_PUBLIC_FILES_BUCKET_SECONDS = 300;

const router = Router();

router.get("/upload", async (req, res) =>
  res
    .status(200)
    .send(
      await getFileUploadUrl("public-files", EXPIRE_PUBLIC_FILES_BUCKET_SECONDS)
    )
);

export default router;
