#include <stdlib.h>
struct Bytes { char before; char text[4]; int value; };
int inspect(int parameter) {
  unsigned char *bytes = (unsigned char *)&parameter;
  unsigned char last = bytes[sizeof(parameter) - 1];
  bytes[sizeof(parameter) - 1] = last;
  return parameter;
}
int main(void) {
  struct Bytes s;
  s.text[0] = 'a';
  s.text[1] = 0;
  s.value = 37;
  unsigned char *bytes = (unsigned char *)&s;
  unsigned char padding = bytes[1 + sizeof(s.text)];
  if (inspect(s.value) != 37 || s.text[0] != 'a') return 1;
  for (int i = 0; i < 3; i++) {
    int *p = malloc(sizeof(int));
    *p = i;
    if (inspect(*p) != i) return 2;
    free(p);
    if (i == 1) continue;
    if (i == 2) break;
  }
  return 0;
}
