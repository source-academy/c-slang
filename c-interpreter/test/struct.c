struct test
{
  char c[3][2];
  int a;
  char * color;
  char d;
  struct inner {
    short s;
    _Bool wow;
  } s;
} xs[3];


int a=-1, b = -2, d = 0x0afa0101;
unsigned long long e = 20000;

int fact_iter(int i, int n, int acc) {
  return i > n ? acc : fact_iter(i + 1, n, acc * i);
}

int fact(int n) {
  return fact_iter(1, n, 1);
}

int main() {
  fact(2 * 3);
  return 0;
}