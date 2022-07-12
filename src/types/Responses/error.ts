const dict = {
  admin: {
    "Unauthorized operation":
      "Necesitas permisos de administrador para esta operación",
  },
  auth: {
    "Invalid auth": "Ningún usuario o laboratorio encontrado",
    "Unauthorized operation": "Necesitas estar logueado para esta operación",
  },
  redundant: {
    "User already a employee for this lab":
      "El usuario específicado ya es parte de este laboratorio",
  },
  preferences: {
    "Invalid leadingZerosWhenCustomId property > Outside bounds":
      "La propiedad sale fuera de los valores preestablecidos",
  },
  storage: {
    "Invalid image storage host": "Hosting de imágenes no permitido",
  },
  role: {
    "Not enough permissions for this action":
      "No tienes los suficientes permisos para realizar esta acción",
    "The requested validator doesn't have permissions for that test":
      "El validador solicitado no tiene permisos para validar este test",
    "Not a lab user": "No perteneces a ningún laboratorio",
    "Not a lab owner": "No eres dueño de ningún laboratorio",
    "Not a user from this lab": "No eres un usuario de este laboratorio",
    "No user profile for this account":
      "Esta cuenta es únicamente de laboratorio",
  },
  test: {
    "No test with requested params found":
      "Ningún test con los parametros solicitados encontrado",
  },
  hash: {
    "Not a valid access hash": "Token de acceso inválido",
  },
  invitation: {
    "Invalid invitation": "Invitación inválida",
    "The requested invitation already expired":
      "La invitación solicitada ya expiró",
  },
  identifier: {
    "In case you own many labs, you have to specify an identifier":
      "En caso que seas dueño de varios laboratorios, tienes que específicar un identificador",
  },
  deleted: {
    "Cannot update a already deleted test":
      "No se puede modificar un test ya eliminado",
  },
};

export type ResponseErrorDataKey =
  | keyof typeof dict
  | "chemdata"
  | "format"
  | "operation"
  | "validator"
  | "email"
  | "rsaprivatekey"
  | "protocol"
  | "fields"
  | "decryptmethod"
  | "timeout"
  | "json";

export type ResponseErrorData = {
  error: string;
  notUnique?: true;
  key: ResponseErrorDataKey;
};

export class ResponseError {
  constructor(private error: ResponseErrorData) {}
}
