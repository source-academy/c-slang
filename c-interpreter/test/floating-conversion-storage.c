struct Values { float f; double d; int i; };
union Value { int i; double d; float f; };
int main() {
  float a[] = {1, 0.1, [3] = 2.5};
  struct Values values = {0.1, 3, 4.9};
  union Value u = {.d = 2};
  double *p = malloc(sizeof(double));
  if (a[0] != 1.0f || a[1] != 0.1f || a[2] != 0.0f || a[3] != 2.5f) return 0;
  if (values.f != 0.1f || values.d != 3.0 || values.i != 4) return 0;
  if (u.d != 2.0) return 0;
  values.d = a[1];
  u.f = 0.1;
  *p = 3;
  if (values.d != 0.10000000149011612 || u.f != 0.1f || *p != 3.0) return 0;
  free(p);
  return 1;
}
