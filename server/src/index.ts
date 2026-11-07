import { app } from "./app.js";
import { config } from "./config.js";

app.listen(config.PORT, "127.0.0.1", () => {
  console.info(`Serein API listening on http://localhost:${config.PORT}`);
});
