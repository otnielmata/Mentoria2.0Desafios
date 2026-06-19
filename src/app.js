const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");
const routes = require("./routes");
const errorMiddleware = require("./middlewares/error.middleware");
const swaggerDocument = require("./config/swagger");

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "2mb" }));

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/api", routes);

app.use(errorMiddleware);

module.exports = app;
