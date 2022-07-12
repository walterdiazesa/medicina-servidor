import { Router } from "express";
import {
  EXPIRE_PUBLIC_FILES_BUCKET_SECONDS,
  getFileUploadUrl,
} from "../../aws/s3.js";

const router = Router();

router.get("/upload", async (req, res) =>
  res
    .status(200)
    .send(
      await getFileUploadUrl("public-files", EXPIRE_PUBLIC_FILES_BUCKET_SECONDS)
    )
);

export default router;
