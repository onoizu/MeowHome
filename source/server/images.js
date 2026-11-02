// images.js：把前端压缩后的照片保存为文件；数据库只存图片路径。
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { fail } = require("./validation");
function saveImage(value, uploads, allowedPaths = []) {
  if (typeof value !== "string") fail("Please add a photograph.");
  // 编辑时只能沿用当前记录的照片，不接受任意路径。
  if (allowedPaths.includes(value)) return value;
  const match =
    /^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/]+={0,2})$/.exec(value);
  if (!match) fail("Please upload a JPG, PNG or WebP photograph.");
  const data = Buffer.from(match[2], "base64");
  if (!data.length || data.length > 5 * 1024 * 1024)
    fail("Photograph must be smaller than 5 MB.");
  const type = match[1];
  const valid =
    type === "jpeg"
      ? data.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
      : type === "png"
        ? data
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : data.subarray(0, 4).toString() === "RIFF" &&
          data.subarray(8, 12).toString() === "WEBP";
  if (!valid) fail("The image contents do not match its file type.");
  const filename = randomUUID() + (type === "jpeg" ? ".jpg" : "." + type);
  fs.writeFileSync(path.join(uploads, filename), data, { flag: "wx" });
  return "/uploads/" + filename;
}
module.exports = { saveImage };
