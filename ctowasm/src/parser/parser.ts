import grammar from "bundle-text:./main.pegjs";
import peggy from "peggy";
const parser = peggy.generate(grammar as string, {
  allowedStartRules: ["program"],
});

export default parser;
