export const normalize = (string: string) => {
  if (!string) return string;
  return string
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s/g, " ")
    .toLowerCase();
};

const REGEX_NAME =
  /^([a-zA-ZàèìòùÀÈÌÒÙáéíóúýÁÉÍÓÚÝâêîôûÂÊÎÔÛãñõÃÑÕäëïöüÿÄËÏÖÜŸ'\-]{2,20}) ([a-zA-ZàèìòùÀÈÌÒÙáéíóúýÁÉÍÓÚÝâêîôûÂÊÎÔÛãñõÃÑÕäëïöüÿÄËÏÖÜŸ'\-]{2,20} {0,1}){1,9}$/;
export const isName = (name: string) => REGEX_NAME.test(name);
