int main() {
  int total = 0;
  int i = 0;
  while (i < 3) {
    switch (i) {
      case 1:
        break;
      default:
        total = total + 1;
    }
    i = i + 1;
  }
  return total;
}
