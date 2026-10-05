int sign_only(unsigned char *bytes, int size) {
  int signs = 0;
  for (int i = 0; i < size; i++) {
    if (bytes[i] == 128) signs++;
    else if (bytes[i] != 0) return 0;
  }
  return signs == 1 && (bytes[0] == 128 || bytes[size - 1] == 128);
}
union FloatBytes { float value; unsigned char bytes[4]; };
union DoubleBytes { double value; unsigned char bytes[8]; };
int main() {
  union FloatBytes f = {.value = -0.0f};
  union DoubleBytes d = {.value = -0.0};
  if (!sign_only(f.bytes, sizeof f.value)) return 0;
  if (!sign_only(d.bytes, sizeof d.value)) return 0;
  f.value = +f.value;
  d.value = +d.value;
  if (!sign_only(f.bytes, sizeof f.value)) return 0;
  if (!sign_only(d.bytes, sizeof d.value)) return 0;
  f.value = -f.value;
  d.value = -d.value;
  for (int i = 0; i < sizeof f.bytes; i++) if (f.bytes[i] != 0) return 0;
  for (int i = 0; i < sizeof d.bytes; i++) if (d.bytes[i] != 0) return 0;
  if (f.value != 0.0f || d.value != 0.0 || 1.0f / f.value != 1.0 / 0.0) return 0;
  return 1;
}
