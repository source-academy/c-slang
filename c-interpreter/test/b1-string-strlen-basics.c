#include <string.h>
int main(void) {
  char text[] = "hello";
  if (strlen("") != 0) return 1;
  if (strlen("abc") != 3) return 2;
  if (strlen(text) != 5) return 3;
  return 0;
}
