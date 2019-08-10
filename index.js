const fs = require("fs");
const json = require("json-pointer");

module.exports = generate;

let rootSchema = {};

function generate(schema, options = {}) {
  let jsdoc = "";

  if (!schema || Object.keys(schema).length === 0) {
    return jsdoc;
  }

  rootSchema = { ...schema };
  jsdoc += "/**\n";
  jsdoc += writeDescription(schema);

  if (!json.has(schema, "/properties")) {
    return jsdoc;
  }

  jsdoc += processProperties(schema, false, options);

  jsdoc += "  */\n";

  return jsdoc;
}

function processProperties(schema, nested, options = {}) {
  const objDefs = [];
  const props = json.get(schema, "/properties");
  const required = json.has(schema, "/required")
    ? json.get(schema, "/required")
    : [];

  let text = "";
  for (let property in props) {
    const propName = upperFirst(property);
    if (Array.isArray(options.ignore) && options.ignore.includes(property)) {
      continue;
    } else {
      let prefix = nested ? "." : "";
      let optional = !required.includes(property);
      let prop = getProp(props[property], propName) || upperFirst(property);
      let objType = prop.type === "object" && prop.properties;
      let type = objType ? upperFirst(property) : prop.type;
      text += writeParam(type, prefix + property, prop.description, optional);
      if (objType) {
        objDefs.push(writeTypeDef(prop, property, props.description));
      }
    }
  }
  if (objDefs.length > 0) {
    objDefs.forEach(objDef => {
      text += objDef;
    });
  }

  return text;
}

function writeDescription(schema, suffix = "object") {
  let text = schema.description || `Represents a ${schema.id} ${suffix}`;
  text += schema.title ? `\n * @description ${schema.title}` : "";
  text += `\n  * @name ${upperFirst(schema.id)}`;
  return `  * ${text}\n  *\n`;
}

function writeParam(type = "", field, description = "", optional) {
  const fieldTemplate = optional ? `[${field}]` : field;
  return `  * @property {${type}} ${fieldTemplate} - ${description} \n`;
}

function writeTypeDef(obj = { type: "" }, field, description = "") {
  const fieldTemplate = upperFirst(field);
  return ` *\n  * @typedef {${
    obj.type
  }} ${fieldTemplate} - ${description} \n *\n ${processProperties(obj, false)}`;
}

function getProp(schema, propName = "") {
  if (schema.type === "object" && !schema.description) {
    schema.description = `Represents a ${propName} object`;
  }

  if (schema.$ref) {
    const ref = json.get(rootSchema, schema.$ref.substr(1));
    return getProp(ref);
  }

  if (schema.enum) {
    schema.type = "enum";
    return schema;
  }

  if (Array.isArray(schema.type)) {
    if (schema.type.includes("null")) {
      schema.type = `?${schema.type[0]}`;
      return schema;
    } else {
      schema.type = schema.type.join("|");
      return schema;
    }
  }

  return schema;
}

function upperFirst(str = "") {
  return str.substr(0, 1).toUpperCase() + str.substr(1);
}
