import { Test, User } from "@prisma/client";
import { TestItem } from "../../types/Test.js";

export const validateByRequest = ({
  validator,
  test,
  validationByRequestHash,
}: {
  validator: Partial<User>;
  test: Test & {
    lab: {
      email: string;
      name: string;
      img: string;
      userIds: string[];
      ownerIds: string[];
    };
    patient: {
      name: string;
      email: string;
      phone: string;
      sex: string;
      dui: string;
      dateBorn: Date;
    };
    issuer: {
      name: string;
      email: string;
    };
  };
  validationByRequestHash: string;
}) =>
  `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>	
      .tests-grid {	
        vertical-align: middle;	
      }	
      .tests-grid span {	
        margin: auto;	
      }	
      @media (max-width: 639px) {	
        .tests-grid span {	
          font-size: 12px;	
        }	
      }	
    </style>
</head>
<body>
    <div style="background-color: #e5e7eb; padding: 8px; border-radius: 2px; text-align: center;">
    <div style="border-radius: 8px; background-color: #fff; padding: 16px; text-align: center; max-width: 384px; margin-left: auto; margin-right: auto; padding-bottom: 20px;">
      <img src="${
        test.lab.img
      }" style="width: 288px; margin-bottom: 12px; margin-left: auto; margin-right: auto;" />
      <h1 style="font-weight: 600; color: #374151; margin: 0;">¡&quot;<span style="color: #14b8a6;">${
        test.lab.name
      }</span>&quot; necesita tu validación!</h1>
      <p style="color: #6b7280; margin-bottom: 18px;"><span style="color: #374151; font-weight: 600;">${
        validator.name
      }</span>, han solicitado tu cooperación para validar el siguiente <a style="font-weight: 700; color: #14b8a6;" href="${
    process.env.NODE_ENV.trim() === "DEV"
      ? "http://localhost:3000"
      : process.env.APP_HOST.trim()
  }/test/${
    test.id
  }">test</a>, puedes clickearlo y aprobarlo manualmente (recuerda estar logueado), pero para facilitar tu trabajo te dejamos los datos del test aquí en caso desees aprobarlo directamente</p>
      <p>Fecha: <span style="color: #374151; font-weight: 600;">${new Date(
        test.date
      ).toLocaleString()}</span></p>
      ${
        !test.issuer
          ? ""
          : `<p>Tester: <span style="color: #374151; font-weight: 600;">${test.issuer.name} (${test.issuer.email})</span></p>`
      }
      ${
        !test.patient
          ? ""
          : `<p>Paciente: <span style="color: #374151; font-weight: 600;">${
              test.patient.name
            } (${test.patient.dui}, ${test.patient.sex}, ${new Date(
              test.patient.dateBorn
            ).toLocaleDateString()}, ${test.patient.phone}, ${
              test.patient.email
            })</span></p>`
      }
      <p>Sexo según Chem: <span style="color: #374151; font-weight: 600;">${
        test.sex
      }</span></p>
      <div class="tests-grid" style="background-color: #d3d3d3; display: flex; font-weight: 600;">
        <span style="width: 30%;">Prueba</span>
        <span style="width: 24%;">Resultado</span>
        <span style="width: 16.3%;">Unidad</span>
        <span style="width: 29.7%;">Rango de referencia</span>
      </div>
      ${(test.tests as unknown as TestItem[])
        .map(
          (
            item,
            testIdx,
            { length: testsLength }
          ) => `<div class="tests-grid" style="display: flex; margin-top: 8px;${
            testIdx === testsLength - 1 ? " margin-bottom: 24px;" : ""
          }">
          <span style="width: 30%;">
            ${item.name} ${item.assign}
          </span>
          <span style="width: 24%;">
            ${item.value.replace(/[a-zA-Z]/g, "").replace("/", "")}
          </span>
          <span style="width: 16.3%;">${item.value.replace(/\d/g, "")}</span>
          <span style="width: 29.7%;">
            ${
              !item.range
                ? "-"
                : `(${item.range.item}) ${item.range.between.from} - ${item.range.between.to}`
            }
          </span>
        </div>`
        )
        .join("")}
      <a href="${
        process.env.NODE_ENV.trim() === "DEV"
          ? "http://localhost:8080"
          : process.env.API_HOST.trim()
      }/test/validation/submit/${validationByRequestHash}" style="border-radius: 6px; background-color: #14b8a6; color: #fff; font-weight: 600; padding-left: 16px; padding-right: 16px; padding-top: 8px; padding-bottom: 10px; text-decoration: none;">Validar Test</a>
    </div>
  </div>
</body>
</html>`;
