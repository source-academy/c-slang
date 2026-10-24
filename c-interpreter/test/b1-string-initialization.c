#include <string.h>
#include <stdlib.h>
struct P { char c; int n; };
struct P padded;
char staticZero[8];
unsigned char *unknown;
unsigned char *filled;
unsigned char *copied;
unsigned char *paddingCopy;
char *stringCopy;
int main(void) {
  unsigned char *p = malloc(8);
  for (int i = 0; i < 8; i++) p[i] = 9;
  free(p);
  unknown = malloc(8);
  unknown[1] = 7;
  filled = malloc(8);
  memset(filled + 2, 0, 3);
  if (filled[2] != 0 || filled[4] != 0) return 2;
  copied = malloc(8);
  memset(copied, 9, 8);
  memcpy(copied + 2, unknown, 4);
  if (copied[0] != 9 || copied[3] != 7 || copied[6] != 9) return 3;
  struct P source;
  source.c = 'p'; source.n = 7;
  memcpy(&padded, &source, sizeof source);
  paddingCopy = malloc(sizeof source);
  memcpy(paddingCopy, &source, sizeof source);
  if (padded.c != 'p' || padded.n != 7) return 4;
  stringCopy = malloc(8);
  strcpy(stringCopy, "hi");
  if (strcmp(stringCopy, "hi") != 0) return 5;
  if (unknown[1] != 7 || staticZero[7] != 0) return 1;
  return 0;
}
