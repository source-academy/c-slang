int x = 1;

int read_x(void) { return x; }

int main(void) {
  int x = 2;
  {
    int x = 3;
    if (read_x() != 1) return 1;
    if (x != 3) return 2;
    for (int i = 0; i < 2; i++) {
      int x = 4 + i;
      if (read_x() != 1) return 3;
      if (x != 4 + i) return 4;
    }
    if (x != 3) return 5;
  }
  if (x != 2) return 6;
  if (read_x() != 1) return 7;
  return 0;
}
