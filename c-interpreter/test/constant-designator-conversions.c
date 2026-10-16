int main(void) {
  int a[5] = { [(unsigned char)258] = 7, [(char)300 - 40] = 9 };
  int b[3] = { [0 ? (1 / 0) : 1] = 8 };
  return a[2] == 7 && a[4] == 9 && a[1] == 0 && b[1] == 8 && b[0] == 0;
}
