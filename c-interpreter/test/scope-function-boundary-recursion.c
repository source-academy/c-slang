int depth = 100;

int sum(int n) {
  if (n == 0) return depth;
  int depth = n;
  return sum(n - 1) + depth;
}

int main(void) {
  if (sum(3) != 106) return 1;
  return 0;
}
