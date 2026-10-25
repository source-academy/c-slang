int main(void) {
  int x = 5;
  long p = (long)&x;
  int *q = (int *)0;
  int *r = (int *)p;
  return (p != 0) + (q == 0) + (*r == 5) - 3;
}
