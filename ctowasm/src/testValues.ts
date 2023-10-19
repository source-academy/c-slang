/**
 * Add import of a log function and the call of logs for each variable in main - part of testing process.
 */
function addDebugStatements(watStr: string) {
  const indexToAddLogImport = watStr.indexOf("(memory");
  const indexToAddLogStatements = watStr.indexOf(")\n\t(start $main)")
  
}