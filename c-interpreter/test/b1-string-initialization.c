#include <string.h>
char staticZero[8];
unsigned char *unknown;
unsigned char *filled;
int main(void) {
  unsigned char *p = malloc(8);
  for (int i = 0; i < 8; i++) p[i] = 9;
  free(p);
  unknown = malloc(8);
  unknown[1] = 7;
  filled = malloc(8);
  memset(filled + 2, 0, 3);
  if (filled[2] != 0 || filled[4] != 0) return 2;
  if (unknown[1] != 7 || staticZero[7] != 0) return 1;
  return 0;
}
