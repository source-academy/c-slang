enum { FIRST = 1, SECOND, THIRD };
int main(void) {
  int a[5] = { [THIRD - FIRST] = 7 };
  {
    enum { FIRST = 3 };
    int b[5] = { [FIRST + 1] = 9 };
    if (b[4] != 9 || b[3] != 0) return 0;
  }
  int c[3] = { [FIRST] = 8 };
  return a[2] == 7 && a[3] == 0 && c[1] == 8;
}
