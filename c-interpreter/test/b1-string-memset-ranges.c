#include <string.h>
int main(void) {
  unsigned char b[5] = {1, 2, 3, 4, 5};
  if (memset(b + 1, 7, 3) != b + 1) return 1;
  if (b[0] != 1 || b[1] != 7 || b[3] != 7 || b[4] != 5) return 2;
  if (memset(b, 9, 0) != b || memset(b + 5, 9, 0) != b + 5) return 3;
  if (b[0] != 1 || b[4] != 5) return 4;
  return 0;
}
