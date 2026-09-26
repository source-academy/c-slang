int main() {
  int total = 0;
  int i = 0;
  while (i < 3) {
    int j = 0;
    while (j < 2) {
      j = j + 1;
    }
    total = total + 1;
    i = i + 1;
    continue;
  }
  return total;
}
