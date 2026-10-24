#include <string.h>
int main(void) {
  char left[] = {'a', 0, 'x'};
  char right[] = {'a', 0, 'y'};
  if (strcmp("", "") != 0) return 1;
  if (strcmp("", "a") >= 0 || strcmp("a", "") <= 0) return 2;
  if (strcmp("ab", "abc") >= 0 || strcmp("abc", "ab") <= 0) return 3;
  if (strcmp(left, right) != 0) return 4;
  return 0;
}
