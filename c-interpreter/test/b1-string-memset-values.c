#include <string.h>
int main(void) {
  unsigned char b[5] = {9, 9, 9, 9, 9};
  memset(b, 0, 1); memset(b + 1, -1, 1);
  memset(b + 2, 256, 1); memset(b + 3, 257, 1);
  if (b[0] != 0 || b[1] != 255 || b[2] != 0 || b[3] != 1 || b[4] != 9) return 1;
  memset(b, 257.9, 2.9);
  if (b[0] != 1 || b[1] != 1 || b[2] != 0) return 2;
  return 0;
}
