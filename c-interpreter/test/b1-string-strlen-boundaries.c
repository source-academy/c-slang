#include <string.h>
int main(void) {
  char last[4] = {'a', 'b', 'c', 0};
  char tail[5] = {'a', 0, 'x', 'y', 'z'};
  if (strlen(last + 1) != 2) return 1;
  if (strlen(last + 3) != 0) return 2;
  if (strlen(tail) != 1) return 3;
  return 0;
}
