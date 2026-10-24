#include <string.h>
int main(void) {
  char exact[4];
  char buffer[8] = {'?', '?', '?', '?', '?', '?', '?', '?'};
  strcpy(exact, "abc");
  if (exact[3] != 0 || strcmp(exact, "abc") != 0) return 1;
  if (strcpy(buffer + 2, "ab") != buffer + 2) return 2;
  if (buffer[1] != '?' || buffer[4] != 0 || buffer[5] != '?') return 3;
  return 0;
}
