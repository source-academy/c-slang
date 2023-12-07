import wabt from "wabt";

export async function compileWatToWasm(wat: string): Promise<Uint8Array> {
  const w = await wabt();
  return w.parseWat("a", wat).toBinary({}).buffer;
}
