import cluster from "cluster";
import express from "express";
import cors from "cors";
import { cpus } from "os";
import { Server as SocketIOServer } from "socket.io";
import "dotenv/config";

import testRoutes from "./routes/test/index.js";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const numCpus = cpus().length;

let _io: {
  cluster: number;
  io: SocketIOServer<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
}[] = [];

export const getActiveIO = () => {
  return _io[0];
};

if (cluster.isPrimary /*  && process.env.NODE_ENV.trim() !== "DEV" */) {
  for (var i = 0; i < numCpus; i++) {
    cluster.fork();
  }

  cluster.on("exit", function (worker, code, signal) {
    console.log(
      "Worker %d died with code/signal %s. Restarting worker...",
      worker.process.pid,
      signal || code
    );
    _io.splice(
      _io.findIndex((ioItem) => ioItem.cluster === worker.id),
      1
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

  const server = app.listen(process.env.PORT || 8080, () =>
    console.log("Medicina API running...")
  );
  const io = new SocketIOServer(server, {
    cors: { origin: "*" },
    transports: ["websocket"],
  }); // APP_HOST

  const pubClient = createClient({
    url: process.env.REDISPUBSUB.trim().split("|")[0],
    password: process.env.REDISPUBSUB.trim().split("|")[1],
  });
  const subClient = pubClient.duplicate();
  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
  });

  /* io.on("connection", (socket) => {
    socket.emit("welcome", "Hello " + socket.id);
  }); */

  _io.push({ cluster: cluster.worker!.id, io });
}
