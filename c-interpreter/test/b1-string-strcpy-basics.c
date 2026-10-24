#include <string.h>
int main(void) {
  char dest[8] = "zzzzzzz";
  if (strcpy(dest, "") != dest || dest[0] != 0 || dest[1] != 'z') return 1;
  if (strcpy(dest, "cat") != dest) return 2;
  if (strlen(dest) != 3 || strcmp(dest, "cat") != 0 || dest[3] != 0) return 3;
  if (dest[4] != 'z') return 4;
  return 0;
}
