import grammar from "./main.pegjs";
import * as peggy from "peggy";
const parser = peggy.generate(grammar as string, {
  allowedStartRules: ["program"],
});

export default parser;