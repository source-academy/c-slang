#include <string.h>
int main(void) {
  if (strcmp("same", "same") != 0) return 1;
  if (strcmp("abc", "abd") >= 0) return 2;
  if (strcmp("abd", "abc") <= 0) return 3;
  if (strcmp("z", "a") <= 0) return 4;
  return 0;
}
