// index.js：本地启动入口。
// 数据库和图片均保存在 source/database 下
const { createApp } = require("./app");
const app = createApp();
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, host, () =>
  console.log(`MeowHome: http://${host}:${port}`),
);
function stop() {
  server.close(() => {
    app.locals.db.close();
    process.exit(0);
  });
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
