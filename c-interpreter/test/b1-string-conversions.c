#include <string.h>
int main(void) {
  int calls = 0;
  int *p = malloc(4.9 + calls++);
  *p = 7;
  if (*p != 7 || calls != 1) return 1;
  free(p);
  unsigned char buffer[5] = {9, 9, 9, 9, 9};
  int destCalls = 0, valueCalls = 0, countCalls = 0;
  memset(buffer + destCalls++, 257.9 + valueCalls++, 2.9 + countCalls++);
  if (destCalls != 1 || valueCalls != 1 || countCalls != 1) return 2;
  if (buffer[0] != 1 || buffer[1] != 1 || buffer[2] != 9) return 3;
  unsigned long long wide = 1;
  short narrow = 1;
  memset(buffer + 2, 3, wide);
  memset(buffer + 3, 4, narrow);
  if (buffer[2] != 3 || buffer[3] != 4 || buffer[4] != 9) return 4;
  void *(*fill)(void *, int, size_t) = memset;
  if (fill(buffer + 4, 5, 1) != buffer + 4 || buffer[4] != 5) return 5;
  print(3.5);
  return 0;
}
