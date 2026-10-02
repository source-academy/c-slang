void f(int n) {
  int local = n * 2;
  if (n > 0) {
    f(n - 1);
  }
}

int main() {
  f(3);
  return 11;
}
