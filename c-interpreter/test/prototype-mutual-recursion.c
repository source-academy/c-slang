int isOdd(int n);

int isEven(int n) {
  if (n == 0) return 1;
  return isOdd(n - 1);
}

int isOdd(int n) {
  if (n == 0) return 0;
  return isEven(n - 1);
}

int main() {
  if (isEven(10) && isOdd(7)) return 1;
  return 0;
}
