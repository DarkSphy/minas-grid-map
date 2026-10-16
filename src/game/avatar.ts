import { validAvatar } from "./model";
export async function prepareAvatar(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Escolha uma imagem PNG, JPG ou WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Escolha uma foto de até 5 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 40000000)
      throw new Error("A imagem é grande demais. Escolha uma foto menor.");
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 160;
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    canvas
      .getContext("2d")!
      .drawImage(
        image,
        (image.naturalWidth - size) / 2,
        (image.naturalHeight - size) / 2,
        size,
        size,
        0,
        0,
        160,
        160,
      );
    const value = canvas.toDataURL("image/webp", 0.85);
    if (!validAvatar(value))
      throw new Error("Não foi possível preparar esta foto. Tente outra imagem.");
    return value;
  } finally {
    URL.revokeObjectURL(url);
  }
}
