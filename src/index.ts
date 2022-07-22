import cluster from "cluster";
import express, { Request, Response } from "express";
import cors from "cors";
import { cpus } from "os";
import { Server as SocketIOServer } from "socket.io";
import "dotenv/config";

import {
  testRoutes,
  userRoutes,
  labRoutes,
  authRoutes,
  patientRoutes,
  fileRoutes,
} from "./routes/index.js";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { RedisClient, RedisSubClient } from "./redis/index.js";
import { cookieParser, routesGuard } from "./routes/middlewares/index.js";
import { verifyJWT } from "./auth/index.js";
import { getLaboratories } from "./db/Lab/index.js";
import { parseQueryBoolean } from "./routes/middlewares/index.js";
import { getFileUploadUrl } from "./aws/s3.js";

const numCpus = cpus().length;

let _io: {
  cluster: number;
  io: SocketIOServer<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
}[] = [];

export const getActiveIO = () => {
  return _io[0];
};

const corsWhiteList = [process.env.APP_HOST];
if (process.env.NODE_ENV.trim() === "DEV")
  corsWhiteList.push("http://localhost:3000");

// && process.env.NODE_ENV.trim() !== "DEV"
if (cluster.isPrimary) {
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

  // @deprecated
  // Cors doc: https://stackabuse.com/handling-cors-with-node-js/
  //#region CORS
  const corsOptions = (req: Request, callback: any) => {
    let corsOptions: cors.CorsOptions = { origin: false, credentials: true };
    const isDomainAllowed = corsWhiteList.includes(req.headers.origin); // ["GET", "PUT"].includes(req.method) &&
    const isOperationAllowed = (path: string, method: string) => {
      if (!isDomainAllowed) {
        if (path.includes("test") && ["GET", "PUT"].includes(method))
          return false;
        if (path.includes("auth")) return false;
        if (path.includes("files")) return false;
      }
      return true;
    };
    if (isOperationAllowed(req.path, req.method)) {
      corsOptions["origin"] = true;
    }

    callback(null, corsOptions);
  };
  //#endregion

  app.use(cors({ origin: true, credentials: true })); // Allow * origin
  app.use((req, res, next) => routesGuard(corsWhiteList, req, res, next));
  app.use(express.json());
  app.use(cookieParser);
  app.use(parseQueryBoolean());

  app.get("/", (req, res) => res.status(200).send());

  //app.get("/test", (req, res) => res.send([{ cluster }, { cpus: cpus() }]));
  app.use("/test", testRoutes);
  app.use("/users", userRoutes);
  app.use("/patients", patientRoutes);
  app.use("/labs", labRoutes);
  app.use("/auth", authRoutes);
  app.use("/files", fileRoutes);

  const server = app.listen(
    process.env.PORT ? parseInt(process.env.PORT) : 8080,
    "localhost",
    () => console.log("Medicina API running...", process.env.PORT || 8080)
  );
  const io = new SocketIOServer(server, {
    cors: { origin: "*" },
    transports: ["websocket"],
  }); // APP_HOST

  const pubConnection = new RedisClient();
  const subConnection = new RedisSubClient();

  Promise.all([pubConnection.getClient(), subConnection.getClient()])
    .then(([pubClient, subClient]) => {
      pubClient.on("error", (err) => {
        console.error("RedisClient - Pub", err.message);
      });
      subClient.on("error", (err) => {
        console.error("RedisClient - Sub", err.message);
      });
      io.adapter(createAdapter(pubClient, subClient));
    })
    .catch((e) => console.log("Can't connect to the Redis PubSub Client"));

  _io.push({ cluster: cluster.worker!.id, io });
  io.on("connection", (socket) => {
    const headers = socket.request.headers;
    if (headers.origin) {
      if (!corsWhiteList.includes(headers.origin)) return socket.disconnect();
      const cookies: { [key: string]: string } = {};
      //#region parseCookies
      if (headers.cookie) {
        const cookieElements = headers.cookie.split(";");
        cookieElements.forEach((cookieElement) => {
          const [key, value] = cookieElement.split("=");
          cookies[key.trim()] = value.trim();
        });
      }
      //#endregion
      if (!cookies["session"]) return socket.disconnect();
      const user = verifyJWT(cookies["session"]);
      if (!user) return socket.disconnect();

      const userRooms: string[] = [];
      if (user["sub-lab"].length) userRooms.push(...user["sub-lab"]);
      if (user["sub-user"]) userRooms.push(user["sub-user"]);
      getLaboratories({ fields: { id: true }, labFromUser: false }, user).then(
        async (queryLabs) => {
          for (const room of socket.rooms.values()) {
            await socket.leave(room);
          }
          await socket.join([
            ...userRooms,
            ...queryLabs.map(({ id }: { id: string }) => id),
          ]);
          // console.log({ rooms: socket.rooms });
        }
      );
    }
  });
}
