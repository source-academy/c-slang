#include <string.h>
void *typed;
void *cleared;
int main(void) {
  typed = malloc(sizeof(double));
  *(int *)typed = 27;
  if (*(int *)typed != 27) return 1;
  *(float *)typed = 2.5f;
  if (*(float *)typed != 2.5f) return 2;
  unsigned char *bytes = typed;
  unsigned char last = bytes[sizeof(float) - 1];
  if (last != ((unsigned char *)typed)[sizeof(float) - 1]) return 3;
  memset(typed, 0, 0);
  cleared = malloc(sizeof(int));
  *(int *)cleared = 42;
  memset((char *)cleared + 1, 7, 1);
  if (((unsigned char *)cleared)[1] != 7) return 4;
  return 0;
}
