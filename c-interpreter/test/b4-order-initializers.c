int count = 0;

int next(void) { return ++count; }

int main(void) {
  int a[2] = { next(), next() };
  int i = 0;
  int b[2] = { i++, i++ };
  return (a[0] == 1) + (a[1] == 2) + (b[0] == 0) + (b[1] == 1) - 4;
}
