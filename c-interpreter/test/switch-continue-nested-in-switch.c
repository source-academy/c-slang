int main() {
  int total = 0;
  int x = 1;
  switch (x) {
    case 1: {
      int i = 0;
      while (i < 3) {
        i = i + 1;
        if (i == 2) continue;
        total = total + 1;
      }
      break;
    }
  }
  return total;
}
