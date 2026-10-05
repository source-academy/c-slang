int main() {
  int a[3] = {1, 2, 3};
  int *p = a;
  int *null = 0;
  unsigned char byte = 0;
  short small = 0;
  if ((!null) + 1 != 2 || (!p) + 1 != 1) return 0;
  if (((!byte) << 16) != 65536 || ((!small) << 16) != 65536) return 0;
  if (!0LL != 1 || !4ULL != 0) return 0;
  if (p++ != a || p != a + 1) return 0;
  if (--p != a || p != a) return 0;
  if ((p += 2) != a + 2 || (p -= 1) != a + 1) return 0;
  byte = 255;
  if (byte++ != 255 || byte != 0) return 0;
  if (--byte != 255 || byte != 255) return 0;
  if (+byte != 255 || -byte != -255 || ~byte != -256) return 0;
  return 1;
}
