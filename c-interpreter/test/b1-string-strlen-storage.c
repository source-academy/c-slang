#include <string.h>
#include <stdlib.h>
char zero[4];
int main(void) {
  const char text[] = "const";
  unsigned char high[] = {0xc3, 0xa9, 0xff, 0};
  char *p = malloc(3);
  p[0] = 'h'; p[1] = 'i'; p[2] = 0;
  size_t (*length)(const char *) = strlen;
  if (length(text) != 5 || strlen(p) != 2) return 1;
  if (strlen((char *)high) != 3 || strlen(zero) != 0) return 2;
  free(p);
  return 0;
}
