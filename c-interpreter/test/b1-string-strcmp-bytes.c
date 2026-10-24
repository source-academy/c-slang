#include <string.h>
#include <stdlib.h>
int main(void) {
  unsigned char high[] = {0x80, 0};
  unsigned char higher[] = {0xff, 0};
  const char text[] = "hi";
  char *p = malloc(3);
  p[0] = 'h'; p[1] = 'i'; p[2] = 0;
  if (strcmp((char *)high, "z") <= 0) return 1;
  if (strcmp((char *)higher, (char *)high) <= 0) return 2;
  if (strcmp(p, text) != 0 || strcmp(p, p) != 0) return 3;
  free(p);
  return 0;
}
