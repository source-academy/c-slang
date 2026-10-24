#include <string.h>
#include <stdlib.h>
struct S { char c; int n; };
union U { int n; float f; unsigned char bytes[16]; };
int main(void) {
  int source = 123456, dest = 0;
  float value = 2.5f, result = 0.0f;
  memcpy(&dest, &source, sizeof source);
  memcpy(&result, &value, sizeof value);
  if (dest != source || result != value) return 1;
  struct S s, t;
  s.c = 'x'; s.n = 42;
  memcpy(&t, &s, sizeof s);
  if (t.c != 'x' || t.n != 42) return 2;
  unsigned char representation[32];
  memcpy(representation, &s, sizeof s);
  t.n = 0;
  memcpy(&t, representation, sizeof t);
  if (t.c != 'x' || t.n != 42) return 3;
  union U u, v;
  u.f = 3.5f;
  memcpy(&v, &u, sizeof u);
  if (v.f != 3.5f) return 4;
  struct S *p = malloc(sizeof s);
  memcpy(p, &s, sizeof s);
  p->n = 43;
  struct S again = *p;
  if (again.n != 43 || again.c != 'x') return 5;
  free(p);
  return 0;
}
