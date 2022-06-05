export const normalize = (string: string) => {
  if (!string) return string;
  return string
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s/g, " ")
    .toLowerCase();
};
