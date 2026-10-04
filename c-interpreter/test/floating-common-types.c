enum Count { TWO = 2 };
int main() {
  unsigned char byte = 2;
  short small = 2;
  _Bool flag = 1;
  if (sizeof(1.0f + 2) != 4 || sizeof(2 + 1.0f) != 4) return 0;
  if (sizeof(1.0f + 2.0) != 8 || sizeof(2.0 + 1.0f) != 8) return 0;
  if (sizeof(1.0f + 2ULL) != 4 || sizeof(2ULL + 1.0f) != 4) return 0;
  if (sizeof(1.0L + 2.0f) != 8 || sizeof(2.0f + 1.0L) != 8) return 0;
  if (byte + 0.5f != 2.5f || 0.5f + small != 2.5f) return 0;
  if (flag + 0.5 != 1.5 || 0.5f + TWO != 2.5f) return 0;
  if (sizeof(1.0f == 1) != 4 || sizeof(1.0 < 2.0) != 4) return 0;
  return 1;
}
