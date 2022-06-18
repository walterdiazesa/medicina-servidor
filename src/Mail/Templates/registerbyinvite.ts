export const registerByInvite = ({
  name,
  img,
  invitationHash,
}: {
  name: string;
  img: string;
  invitationHash: string;
}) =>
  `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    <div style="background-color: #e5e7eb; padding: 8px; border-radius: 2px; text-align: center;">
    <div style="border-radius: 8px; background-color: #fff; padding: 16px; text-align: center; max-width: 384px; margin-left: auto; margin-right: auto; padding-bottom: 20px;">
      <img src="${img}" style="width: 288px; margin-bottom: 12px; margin-left: auto; margin-right: auto;" />
      <h1 style="font-weight: 600; color: #374151; margin: 0;">¡&quot;<span style="color: #14b8a6;">${name}</span>&quot; te ha invitado a su laboratorio!</h1>
      <p style="color: #6b7280; margin-bottom: 18px;">Es un gusto tenerte en <span style="color: #fb923c; font-weight: 600;">Flemik</span>, somos un sistema completo de administración de laboratorios y en este caso has recibido una invitación para formar parte de este laboratorio, si no reconoces esta invitación puedes hacer caso omiso, en caso contrario solo <span style="font-weight: 700;">deberás clickear el botón de abajo</span> que lleva a nuestra página web con un formulario rápido de registro, en el que definirás tus nuevas credenciales para este y cualquier otro laboratorio en un futuro, ¡Esperamos tenerte con nosotros mucho tiempo!</p>
      <a href="${
        process.env.NODE_ENV.trim() === "DEV"
          ? "http://localhost:3000"
          : process.env.APP_HOST.trim()
      }/register/${invitationHash}" style="border-radius: 6px; background-color: #14b8a6; color: #fff; font-weight: 600; padding-left: 16px; padding-right: 16px; padding-top: 8px; padding-bottom: 10px; text-decoration: none;">Aceptar invitación</a>
    </div>
  </div>
</body>
</html>`;

/*
<div class="bg-gray-20 0 p-2 rounded-sm text-center">
  <div class="rounded-lg bg-white p-4 text-center max-w-sm mx-auto pb-5">
    <img src="https://medicina-app.vercel.app/test-pdf/logo.png" class=" w-72 mb-3 mx-auto" />
    <h1 class="font-semibold text-gray-700">¡"<span class="text-teal-500">Testing Laboratory</span>" te ha invitado a su laboratorio!</h1>
    <p class="text-gray-500 mb-3">Es un gusto tenerte en <span class="text-orange-400 font-semibold">Flemik</span>, somos
    un sistema completo de administración de laboratorios y en este caso has recibido una invitación para formar parte de este
    laboratorio, si no reconoces esta invitación puedes hacer caso omiso, en caso contrario solo <span class="font-bold">deberás clickear el botón de abajo</span>
    que lleva a nuestra página web con un formulario rápido de registro, en el que definirás tus nuevas credenciales para este y cualquier
    otro laboratorio en un futuro, ¡esperamos tenerte con nosotros mucho tiempo!</p>
    <a href="https://medicina-app.vercel.app/" class="rounded-md bg-teal-500 text-white font-semibold px-4 pt-2 pb-2.5">Aceptar invitación</a>
  </div>
</div>
*/
