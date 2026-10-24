typedef unsigned int size_t;
size_t strlen(const char *s);
char *strcpy(char *dest, const char *src);
int strcmp(const char *a, const char *b);
void *memset(void *dest, int value, size_t count);
void *memcpy(void *dest, const void *src, size_t count);
int main(void) {
  char source[4], dest[4];
  strcpy(source, "abc");
  void *(*copy)(void *, const void *, size_t) = memcpy;
  if (copy(dest, source, sizeof source) != dest) return 1;
  if (strcmp(dest, source) != 0 || strlen(dest) != 3) return 2;
  memset(dest, 0, sizeof dest);
  if (strlen(dest) != 0) return 3;
  return 0;
}
