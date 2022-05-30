// @ts-nocheck

const { createInterface } = require("readline");
const axios = require("axios");
const net = require("net");
const ip = require("ip");
const { userInfo } = require("os");

const license = "%LICENSE%";
const PORT = 8080;
const TEST_SUBMIT_HOST =
  "https://medicina-servidor-tu6et.ondigitalocean.app/test";

//#region consoleInput
function consoleInput(query: string) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans: string) => {
      rl.close();
      resolve(ans);
    })
  ) as Promise<string>;
}
//#endregion

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

server.on("connection", function (socket) {
  socket.on("data", async function (chunk: Buffer) {
    socket.pause();
    const chemData = chunk.toString();
    if (!isChem(chemData)) return socket.resume();
    print(
      `${colorKey("purple")}Posible test entrante, ¿Desea continuar? ${colorKey(
        "white"
      )}(s/n)`
    );
    const isExpectedChem = await consoleInput(
      `Escribe "s" o "n" y presiona la tecla [Enter]: `
    );
    // if (!isExpectedChem)
    if (
      isExpectedChem.toLowerCase() !== "s" &&
      isExpectedChem.toLowerCase() !== "si"
    )
      return (
        socket.resume(),
        print(
          `${colorKey(
            "yellow"
          )}Procedimiento cancelado por acción humana, escuchando nuevas peticiones...`
        )
      );
    // if (isExpectedChem)
    // TO-DO: /getUsersFromLab(orLab) with listenerGuard middleware, while(isnt valid and confirm) { ask() }
    // TO-DO: for patient also
    print(
      `${colorKey(
        "blue"
      )}Escribe tu identificador y presiona la tecla ${colorKey(
        "yellow"
      )}[Enter]:`
    );
    let issuer = await consoleInput("");
    print(
      `${colorKey(
        "blue"
      )}Escribe el identificador del paciente y presiona la tecla ${colorKey(
        "yellow"
      )}[Enter]:`
    );
    let patient = await consoleInput("");

    let listenerUsername = "";
    try {
      listenerUsername = JSON.parse(JSON.stringify(userInfo())).username;
    } catch (e) {}

    try {
      const { status, data } = await axios.default.post(
        TEST_SUBMIT_HOST,
        { chemData, issuer, patient, listenerUsername },
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
    print("Escuchando nuevas peticiones...");
    socket.resume();
  });

  // End Cases
  socket.on("end", function () {
    // console.log("\x1b[31mCerrando conexión con el cliente");
  });
  socket.on("error", function (err) {
    // console.log(`\x1b[31mError: ${JSON.stringify(err)}`);
  });
});
