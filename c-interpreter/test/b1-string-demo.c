#include <string.h>

char text[8];
unsigned char source[4] = {0, 128, 255, 7};
unsigned char copied[4];
size_t length;
int order;
void *returned;

int main(void) {
  strcpy(text, "hello");
  length = strlen(text);
  order = strcmp(text, "hello");
  memset(copied, 9, sizeof copied);
  returned = memcpy(copied, source, sizeof source);
  if (length != 5 || order != 0 || returned != copied) return 1;
  for (size_t i = 0; i < sizeof source; i++)
    if (copied[i] != source[i]) return 2;
  return 0;
}
