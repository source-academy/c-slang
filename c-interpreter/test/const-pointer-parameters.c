int increment(int *);
int increment(int *const p) { *p += 1; return *p; }
int main() {
  int x = 1;
  int *p = &x;
  int *const *view = &p;
  const void *v = p;
  int *back = (int *)v;
  *back = 4;
  return increment(*view) == 5 && x == 5;
}
