const { createInterface } = require("readline");
const axios = require("axios");
const net = require("net");
const ip = require("ip");
const { userInfo } = require("os");

const license = "%LICENSE%";
const ENV = "%ENV%";
// @ts-ignore
const PORT = ENV === "DEV" ? 8079 : 8080;
const SERVIDOR_HOST =
  // @ts-ignore
  ENV === "DEV"
    ? "http://localhost:8080"
    : "https://medicina-servidor-tu6et.ondigitalocean.app";

type User = { id: string; email: string; name: string };
interface Employee extends User {}
interface Patient extends User {
  dui: string;
  phone: string;
  sex: string;
  dateBorn: string;
}

function formatDate(date: Date) {
  const dateSplit = date
    .toLocaleDateString("es-SV", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    .split(" ");
  const month: { [month: string]: string } = {
    January: "enero",
    February: "febrero",
    March: "marzo",
    April: "abril",
    May: "mayo",
    June: "junio",
    July: "julio",
    August: "agosto",
    September: "septiembre",
    October: "octubre",
    November: "noviembre",
    December: "diciembre",
  };
  return `${dateSplit[1].replace(",", "")} de ${month[dateSplit[0]]} de ${
    dateSplit[2]
  }`;
}
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

server.on("connection", function (socket: any) {
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
      `Escribe ${colorKey("blue")}"s"${colorKey("white")} o ${colorKey(
        "blue"
      )}"n"${colorKey("white")} y presiona la tecla ${colorKey(
        "yellow"
      )}[Enter]${colorKey("white")}: `
    );
    // if (!isExpectedChem)
    if (
      isExpectedChem.trim().toLowerCase() !== "s" &&
      isExpectedChem.trim().toLowerCase() !== "si"
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
    let issuer = undefined;
    while (issuer === undefined) {
      print(
        `${colorKey(
          "blue"
        )}Escribe tu identificador (id, slug, correo o nombre) o déjalo vacío para usar el del laboratorio y presiona la tecla ${colorKey(
          "yellow"
        )}[Enter]:`
      );
      let _issuer = await consoleInput("");
      if (_issuer.trim() === "") {
        issuer = "";
        break;
      }
      try {
        const { data }: { data: Employee | Employee[] } =
          await axios.default.get(
            `${SERVIDOR_HOST}/users/listener/${_issuer}`,
            { headers: { authorization: license } }
          );
        if (Array.isArray(data)) {
          // start: Case many users retrieved (found by name)
          for (const [idx, employee] of (data as Employee[]).entries()) {
            print(
              `${colorKey("yellow")}${idx + 1}- ${colorKey("white")}${
                employee.email
              }${colorKey("yellow")},${colorKey("white")} ${employee.name}`
            );
          }
          let selectedEmployee = undefined;
          // start: user is in list
          while (selectedEmployee === undefined) {
            const isExpectedEmployeeFromList = await consoleInput(
              `${colorKey(
                "blue"
              )}Si alguno de los usuarios de la lista es el esperado, escriba el número correspondiente y después la tecla ${colorKey(
                "yellow"
              )}[Enter]${colorKey("blue")}, ${colorKey(
                "purple"
              )}si no${colorKey(
                "blue"
              )}, únicamente presione la tecla ${colorKey(
                "yellow"
              )}[Enter]${colorKey("white")}: `
            );
            if (
              isExpectedEmployeeFromList.trim() === "" ||
              isNaN(parseInt(isExpectedEmployeeFromList))
            )
              break;
            const employeeIdx = parseInt(isExpectedEmployeeFromList);
            if (employeeIdx && employeeIdx <= (data as Employee[]).length) {
              print(
                `${colorKey(
                  "white"
                )}¿Usted quiere seleccionar al usuario "${colorKey("yellow")}${
                  (data as Employee[])[employeeIdx - 1].name
                }${colorKey("white")}", con correo "${colorKey("yellow")}${
                  (data as Employee[])[employeeIdx - 1].email
                }${colorKey("white")}"?`
              );
              if (
                (
                  await consoleInput(
                    `${colorKey(
                      "blue"
                    )}Si el usuario anterior es el esperado escriba "${colorKey(
                      "green"
                    )}s${colorKey("blue")}" y después la tecla ${colorKey(
                      "yellow"
                    )}[Enter]${colorKey("blue")}, ${colorKey(
                      "purple"
                    )}si no${colorKey(
                      "blue"
                    )}, presione únicamente la tecla ${colorKey(
                      "yellow"
                    )}[Enter]${colorKey("white")}: `
                  )
                )
                  .trim()
                  .toLowerCase() === "s"
              ) {
                selectedEmployee = (data as Employee[])[employeeIdx - 1].id;
              }
            } else {
              print(
                `${colorKey("purple")}El índice ${colorKey(
                  "red"
                )}${employeeIdx}${colorKey(
                  "purple"
                )} excede los usuarios obtenidos con la búsqueda actual.`
              );
            }
          }
          // end: user is in list
          if (selectedEmployee) issuer = selectedEmployee;
          // end: Case many users retrieved (found by name)
        } else {
          // start: Case unique user retrieve (found by id, email or slug)
          print(
            `${colorKey(
              "white"
            )}¿Usted quiere seleccionar al usuario "${colorKey("yellow")}${
              (data as Employee).name
            }${colorKey("white")}", con correo "${colorKey("yellow")}${
              (data as Employee).email
            }${colorKey("white")}"?`
          );
          if (
            (
              await consoleInput(
                `${colorKey(
                  "blue"
                )}Si el usuario anterior es el esperado escriba "${colorKey(
                  "green"
                )}s${colorKey("blue")}" y después la tecla ${colorKey(
                  "yellow"
                )}[Enter]${colorKey("blue")}, ${colorKey(
                  "purple"
                )}si no${colorKey(
                  "blue"
                )}, presione únicamente la tecla ${colorKey(
                  "yellow"
                )}[Enter]${colorKey("white")}: `
              )
            )
              .trim()
              .toLowerCase() === "s"
          ) {
            issuer = (data as Employee).id;
          }
          // end: Case unique user retrieve (found by id, email or slug)
        }
      } catch (e) {
        // start: In case no user/s retrieved
        if (e.response.status === 404) {
          print(
            `${colorKey("purple")}El usuario con identificador ${colorKey(
              "red"
            )}${_issuer}${colorKey("purple")} no pudo ser encontrado.`
          );
        } else {
          print(
            `${colorKey(
              "red"
            )}Ha ocurrido un error al obtener el/los usuarios del laboratorio...`
          );
          print(`${colorKey("red")}${JSON.stringify(e)}`);
        }
        // end: In case no user/s retrieved
      }
    }

    let patient = undefined;
    while (patient === undefined) {
      print(
        `${colorKey(
          "blue"
        )}Escribe el identificador del paciente (nombre, correo, teléfono o identificación) o déjalo vacío para crear un test sin paciente y presiona la tecla ${colorKey(
          "yellow"
        )}[Enter]:`
      );
      let _patient = await consoleInput("");
      if (_patient.trim() === "") {
        patient = "";
        break;
      }
      try {
        const { data }: { data: Patient | Patient[] } = await axios.default.get(
          `${SERVIDOR_HOST}/patients/listener/${_patient}`,
          { headers: { authorization: license } }
        );
        if (Array.isArray(data)) {
          // start: Case many patient retrieved (found by name)
          for (const [idx, patient] of (data as Patient[]).entries()) {
            print(
              `${colorKey("yellow")}${idx + 1}- ${colorKey("white")}${
                patient.name
              }${colorKey("yellow")}, ${colorKey("white")}${
                patient.dui
              }${colorKey("yellow")}, ${colorKey(
                patient.sex === "Masculino"
                  ? "blue"
                  : patient.sex === "Femenino"
                  ? "purple"
                  : "white"
              )}${patient.sex}${colorKey("yellow")}, ${colorKey("white")}${
                patient.phone
              }${colorKey("yellow")}, ${colorKey("white")}${formatDate(
                new Date(patient.dateBorn)
              )}${colorKey("yellow")}, ${colorKey("white")}${patient.email}`
            );
          }
          let selectedPatient = undefined;
          // start: patient is in list
          while (selectedPatient === undefined) {
            const isExpectedPatientFromList = await consoleInput(
              `${colorKey(
                "blue"
              )}Si alguno de los pacientes de la lista es el esperado, escriba el número correspondiente y después la tecla ${colorKey(
                "yellow"
              )}[Enter]${colorKey("blue")}, ${colorKey(
                "purple"
              )}si no${colorKey(
                "blue"
              )}, únicamente presione la tecla ${colorKey(
                "yellow"
              )}[Enter]${colorKey("white")}: `
            );
            if (
              isExpectedPatientFromList.trim() === "" ||
              isNaN(parseInt(isExpectedPatientFromList))
            )
              break;
            const patientIdx = parseInt(isExpectedPatientFromList);
            if (patientIdx && patientIdx <= (data as Patient[]).length) {
              print(
                `${colorKey(
                  "white"
                )}¿Usted quiere seleccionar al paciente "${colorKey("yellow")}${
                  (data as Patient[])[patientIdx - 1].name
                }${colorKey("white")}", con identificación "${colorKey(
                  "yellow"
                )}${(data as Patient[])[patientIdx - 1].dui}${colorKey(
                  "white"
                )}"?`
              );
              if (
                (
                  await consoleInput(
                    `${colorKey(
                      "blue"
                    )}Si el paciente anterior es el esperado escriba "${colorKey(
                      "green"
                    )}s${colorKey("blue")}" y después la tecla ${colorKey(
                      "yellow"
                    )}[Enter]${colorKey("blue")}, ${colorKey(
                      "purple"
                    )}si no${colorKey(
                      "blue"
                    )}, presione únicamente la tecla ${colorKey(
                      "yellow"
                    )}[Enter]${colorKey("white")}: `
                  )
                )
                  .trim()
                  .toLowerCase() === "s"
              ) {
                selectedPatient = (data as Patient[])[patientIdx - 1].id;
              }
            } else {
              print(
                `${colorKey("purple")}El índice ${colorKey(
                  "red"
                )}${patientIdx}${colorKey(
                  "purple"
                )} excede los pacientes obtenidos con la búsqueda actual.`
              );
            }
          }
          // end: patient is in list
          if (selectedPatient) patient = selectedPatient;
          // end: Case many users retrieved (found by name)
        } else {
          // start: Case unique patient retrieve (found by id, email, phone or dui)
          print(
            `${colorKey(
              "white"
            )}¿Usted quiere seleccionar al paciente "${colorKey("yellow")}${
              (data as Patient).name
            }${colorKey("white")}", con identificación "${colorKey("yellow")}${
              (data as Patient).dui
            }${colorKey("white")}"?`
          );
          if (
            (
              await consoleInput(
                `${colorKey(
                  "blue"
                )}Si el paciente anterior es el esperado escriba "${colorKey(
                  "green"
                )}s${colorKey("blue")}" y después la tecla ${colorKey(
                  "yellow"
                )}[Enter]${colorKey("blue")}, ${colorKey(
                  "purple"
                )}si no${colorKey(
                  "blue"
                )}, presione únicamente la tecla ${colorKey(
                  "yellow"
                )}[Enter]${colorKey("white")}: `
              )
            )
              .trim()
              .toLowerCase() === "s"
          ) {
            patient = (data as Patient).id;
          }
          // end: Case unique patient retrieve (found by id, email or slug)
        }
      } catch (e) {
        // start: In case no patient/s retrieved
        if (e.response.status === 404) {
          print(
            `${colorKey("purple")}El paciente con identificador ${colorKey(
              "red"
            )}${_patient}${colorKey("purple")} no pudo ser encontrado.`
          );
        } else {
          print(
            `${colorKey(
              "red"
            )}Ha ocurrido un error al obtener el/los pacientes...`
          );
          print(`${colorKey("red")}${JSON.stringify(e)}`);
        }
        // end: In case no patient/s retrieved
      }
    }

    let listenerUsername = "";
    try {
      listenerUsername = JSON.parse(JSON.stringify(userInfo())).username;
    } catch (e) {}

    try {
      const { status, data } = await axios.default.post(
        `${SERVIDOR_HOST}/test`,
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
  socket.on("error", function (err: any) {
    // console.log(`\x1b[31mError: ${JSON.stringify(err)}`);
  });
});
