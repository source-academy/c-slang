int main() {
  _Bool flag = 1;
  short small = -3;
  float f = 0.1f;
  if ((float)3 != 3.0f || (double)small != 0.0 - 3.0) return 0;
  if ((float)flag != 1.0f || (double)'A' != 65.0) return 0;
  if ((double)f != 0.10000000149011612 || (float)0.1 != f) return 0;
  if ((float)4611686293305294849LL != 4611686568183201792.0f) return 0;
  if ((float)(-4611686293305294849LL) != 0.0f - 4611686568183201792.0f) return 0;
  if ((double)9007199254740993LL != 9007199254740992.0) return 0;
  if ((float)18446744073709551615ULL != 18446744073709551616.0f) return 0;
  if ((float)16777217.0 != 16777216.0f || (float)16777219.0 != 16777220.0f) return 0;
  return 1;
}
