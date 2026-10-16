enum { LAST = 3 };
int main(void) {
  int a[] = { [LAST - 1] = 7, 8, [0] = 9 };
  int b[] = { [sizeof(&b) / sizeof(int *)] = 4 };
  return sizeof a == 4 * sizeof(int) && a[0] == 9 && a[1] == 0
      && a[2] == 7 && a[3] == 8 && sizeof b == 2 * sizeof(int)
      && b[0] == 0 && b[1] == 4;
}
