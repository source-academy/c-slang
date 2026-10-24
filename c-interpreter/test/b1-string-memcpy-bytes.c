#include <string.h>
int main(void) {
  unsigned char source[5] = {0, 0x80, 0xff, 0, 7};
  unsigned char dest[5];
  if (memcpy(dest, source, sizeof source) != dest) return 1;
  for (size_t i = 0; i < sizeof source; i++) if (dest[i] != source[i]) return 2;
  unsigned char adjacent[6] = {1, 0, 255, 9, 9, 9};
  memcpy(adjacent + 3, adjacent, 3);
  if (adjacent[3] != 1 || adjacent[4] != 0 || adjacent[5] != 255) return 3;
  return 0;
}
