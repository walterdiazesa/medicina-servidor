import cluster from "cluster";
import express from "express";
import cors from "cors";
import { cpus } from "os";
import "dotenv/config";

import testRoutes from "./routes/test/index.js";

const numCpus = cpus().length;

if (cluster.isPrimary && process.env.NODE_ENV.trim() !== "DEV") {
  for (var i = 0; i < numCpus; i++) {
    cluster.fork();
  }

  cluster.on("exit", function (worker, code, signal) {
    console.log(
      "Worker %d died with code/signal %s. Restarting worker...",
      worker.process.pid,
      signal || code
    );
    cluster.fork();
  });
} else {
  const app = express();

  // TO-DO: add specific cors, e.g GET: /test (cors("[next*]"), POST: /test (cors("*")))
  // Cors doc: https://stackabuse.com/handling-cors-with-node-js/
  app.use(cors()); // Allow * origin
  app.use(express.json());

  app.get("/", (req, res) => res.send([{ cluster }, { cpus: cpus() }]));

  //app.get("/test", (req, res) => res.send([{ cluster }, { cpus: cpus() }]));
  app.use("/test", testRoutes);

  app.listen(process.env.PORT || 8080, () =>
    console.log("Medicina API running...")
  );
}
