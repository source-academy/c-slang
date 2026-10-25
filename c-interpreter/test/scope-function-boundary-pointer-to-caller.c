void set(int *x) { *x = 5; }

int twice(int x) { return x * 2; }

int main(void) {
  int x = 1;
  set(&x);
  if (x != 5) return 1;
  if (twice(10) != 20) return 2;
  if (x != 5) return 3;
  return 0;
}
