#include <string.h>
int main(void) {
  char source[4] = {'a', 0, 'b', 'c'};
  char dest[6] = {'?', '?', '?', '?', '?', '?'};
  if (memcpy(dest + 1, source + 1, 2) != dest + 1) return 1;
  if (dest[0] != '?' || dest[1] != 0 || dest[2] != 'b' || dest[3] != '?') return 2;
  if (memcpy(dest, dest, 0) != dest) return 3;
  if (memcpy(dest + 6, source + 4, 0) != dest + 6) return 4;
  if (dest[0] != '?' || dest[2] != 'b' || dest[5] != '?') return 5;
  return 0;
}
