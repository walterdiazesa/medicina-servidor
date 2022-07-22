import { Router } from "express";
import {
  EXPIRE_PUBLIC_FILES_BUCKET_SECONDS,
  getFileUploadUrl,
} from "../../aws/s3.js";

const router = Router();

router.get("/upload", async (req, res) => {
  console.log(
    "New request to /files/upload",
    req.headers.origin,
    req.headers.host
  );
  if (req.headers.origin !== process.env.APP_HOST)
    return res.status(403).send("No estás authorizado lmao");
  res.send(
    await getFileUploadUrl("public-files", EXPIRE_PUBLIC_FILES_BUCKET_SECONDS)
  );
});

export default router;
