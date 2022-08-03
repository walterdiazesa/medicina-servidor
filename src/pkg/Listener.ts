const axios = require("axios");
const net = require("net");
const ip = require("ip");
const { userInfo } = require("os");
const crypto = require("crypto");

const license = "%LICENSE%";
const ENV = "%ENV%";

const PUBLIC_RSA_KEY = `%RSA_PUBLIC%`;
const AES_ALGORITHM = "aes-256-cbc";

// @ts-ignore
const PORT = ENV === "DEV" ? 8079 : 8080;
const SERVIDOR_HOST =
  // @ts-ignore
  ENV === "DEV" ? "http://localhost:8080" : process.env.API_HOST;

const rsaEncrypt = (data: string) => {
  return crypto
    .publicEncrypt(
      {
        key: PUBLIC_RSA_KEY,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(data)
    )
    .toString("hex");
};

const encrypt = (text: string) => {
  const iv = crypto.randomBytes(16);
  const key = crypto.randomBytes(32);
  const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

  return {
    iv: iv.toString("hex"),
    data: encrypted.toString("hex"),
    key: rsaEncrypt(key.toString("hex")),
  };
};

//#region print
type Color = "yellow" | "green" | "blue" | "white" | "purple" | "red";
const colorSchema: { [color: string]: string } = {
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  blue: "\x1b[36m",
  white: "\x1b[37m",
  purple: "\x1b[35m",
  red: "\x1b[31m",
};
const colorKey = (color: Color) => colorSchema[color];
const print = (text: string) => {
  console.log(`${text}\x1b[0m`);
};
//#endregion

// TO-DO: Implement a global chem identifier
const isChem = (message: string) => true;

// TCP Server
const server = new net.Server();

server.listen(PORT, function () {
  print(
    `${colorKey("yellow")}Servidor TCP en ${colorKey(
      "green"
    )}${ip.address()}:${PORT}`
  );
});

server.on("connection", function (socket: any) {
  socket.on("data", async function (chunk: Buffer) {
    const chemData = chunk.toString();
    if (!isChem(chemData)) return;
    print(`${colorKey("purple")}Nuevo test entrante, enviando al servidor...`);

    // Remove after globalChemIdentifier
    console.log({ chemData });

    let listenerUsername = "";
    try {
      listenerUsername = JSON.parse(JSON.stringify(userInfo())).username;
    } catch (e) {}

    try {
      const { status, data } = await axios.default.post(
        `${SERVIDOR_HOST}/test`,
        encrypt(
          JSON.stringify({ chemData, listenerUsername, signedAt: Date.now() })
        ),
        { headers: { authorization: license } }
      );
      if (status === 201) {
        print(
          `${colorKey("yellow")}Test ${
            data.id
          } creado con éxito, revisa la página de /test`
        );
      }
    } catch (e) {
      print(`${colorKey("red")}Ha ocurrido un error al procesar el test...`);
      print(`${colorKey("red")}${JSON.stringify(e)}`);
    }
  });

  // End Cases
  socket.on("end", function () {
    // console.log("\x1b[31mCerrando conexión con el cliente");
  });
  socket.on("error", function (err: any) {
    // console.log(`\x1b[31mError: ${JSON.stringify(err)}`);
  });
});
