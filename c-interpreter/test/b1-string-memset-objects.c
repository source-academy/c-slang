#include <string.h>
#include <stdlib.h>
struct S { char c; int n; };
int main(void) {
  int value = 42;
  struct S s;
  memset(&value, 0, sizeof value);
  memset(&s, 0, sizeof s);
  if (value != 0 || s.c != 0 || s.n != 0) return 1;
  unsigned char *bytes = (unsigned char *)&value;
  for (size_t i = 0; i < sizeof value; i++) if (bytes[i] != 0) return 2;
  memset(bytes + 1, 0xab, 1);
  if (bytes[1] != 0xab || bytes[0] != 0) return 3;
  int *p = malloc(sizeof(int));
  memset(p, 0, sizeof(int));
  if (*p != 0) return 4;
  free(p);
  return 0;
}
