int sum_to(int n) {
  if (n == 0) return 0;
  return n + sum_to(n - 1);
}

int main(void) {
  if (sum_to(500) != 125250) return 1;

  int a[4] = {1, 2, 3, 4};
  int *onePastEnd = a + 4;
  if (onePastEnd != a + 4) return 2;

  return 0;
}
