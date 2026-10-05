int main() {
  float x = 1.5f;
  if ((x += 0.5f) != 2.0f || x != 2.0f) return 0;
  if ((x -= 0.25) != 1.75f || x != 1.75f) return 0;
  if ((x *= 2) != 3.5f || x != 3.5f) return 0;
  if ((x /= 2.0) != 1.75f || x != 1.75f) return 0;
  x = 16777216.0f;
  if ((x += 1.0) != 16777216.0f || x != 16777216.0f) return 0;
  x = 1.0f;
  if ((x += 0.000000059604644775390625) != 1.0f) return 0;
  x = 0.0f;
  if ((x += 4611686293305294849LL) != 4611686568183201792.0f) return 0;
  x = 1.0f;
  x *= 1e300;
  if (x != 1.0f / 0.0f) return 0;
  return 1;
}
