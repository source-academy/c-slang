int calls = 0;
double value = 4.0;
double *locate() { calls++; return &value; }
int main() {
  float a[] = {1.5f, 2.5f, 3.5f};
  int i = 0;
  if (a[i++]++ != 1.5f || i != 1 || a[0] != 2.5f) return 0;
  if (++a[i++] != 3.5f || i != 2 || a[1] != 3.5f) return 0;
  if ((a[i++] += 0.5) != 4.0f || i != 3 || a[2] != 4.0f) return 0;
  if (++*locate() != 5.0 || calls != 1 || value != 5.0) return 0;
  if ((*locate() /= 2) != 2.5 || calls != 2 || value != 2.5) return 0;
  double *p = &value;
  if ((*p)-- != 2.5 || value != 1.5) return 0;
  return 1;
}
