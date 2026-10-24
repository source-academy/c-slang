#if 0
#include "missing.h"
#endif
unsigned int strlen(const char *s);
#include <string.h>
#include "string.h"
#if 1
#include <string.h>
#endif

size_t identity(size_t n) { return n; }

int main(void) {
  size_t n = sizeof(int);
  void *p = NULL;
  if (p != 0) return 1;
  if (identity(n) != sizeof(int)) return 2;
  if ((size_t)-1 < 0) return 3;
  if (strlen("ok") != 2) return 4;
  return 0;
}
