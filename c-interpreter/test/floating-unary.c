int main() {
  const float f = 1.25f;
  const double d = 2.5;
  if (+f != 1.25f || -f != -1.25f || -(-f) != f) return 0;
  if (+d != 2.5 || -d != -2.5 || -(-d) != d) return 0;
  if (sizeof(+f) != sizeof(float) || sizeof(-d) != sizeof(double)) return 0;
  if ((int)-3.9 != -3 || -0.1f != 0.0f - 0.1f) return 0;
  if (-1.401298464324817e-45f != 0.0f - 1.401298464324817e-45f) return 0;
  if (-(0.0 / 0.0) == 0.0 || +(0.0f / 0.0f) == 0.0f) return 0;
  print(-f);
  print(-(1.0 / 0.0));
  return 1;
}
