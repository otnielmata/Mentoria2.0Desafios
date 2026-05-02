const path = require("path");
const YAML = require("yamljs");

const swaggerDocument = YAML.load(path.resolve(__dirname, "../../docs/swagger.yaml"));

module.exports = swaggerDocument;
