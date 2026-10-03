const int *view(int *p) { return p; }
int main() {
  int a[2] = {3, 4};
  int *p = a;
  const int *q = view(p);
  const void *v = q;
  const int *r = v;
  const int *choice = 1 ? p : q;
  const void *other = 0 ? v : p;
  int *back = (int *)q;
  int *same = (int *)p;
  *back = 9;
  return *r == 9 && *choice == 9 && other == p && same == p
      && q == p && q < p + 1 && (p + 1) - q == 1;
}
