int main() {
  int total = 0;
  for (int i = 0, j = 10; i < j; i = i + 1, j = j - 1) {
    total = total + 1;
  }
  return total;
}
