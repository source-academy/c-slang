#include <string.h>
#include <stdlib.h>
struct S { char text[5]; int sentinel; };
int main(void) {
  const char source[] = "four";
  struct S s;
  s.sentinel = 17;
  char *heap = malloc(sizeof source);
  strcpy(s.text, source);
  strcpy(heap, "four");
  if (strcmp(heap, s.text) != 0 || strlen(heap) != 4) return 1;
  if (s.sentinel != 17) return 2;
  free(heap);
  return 0;
}
