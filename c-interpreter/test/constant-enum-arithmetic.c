enum Values { FIRST = 1 + 2, NEXT, DOUBLE = NEXT * 2, NEGATIVE = -DOUBLE, AFTER };
enum Other { COPIED = DOUBLE + 1, SHIFTED = 1 << 3 };
int main(void) {
  int a[10] = { [COPIED] = 7 };
  return FIRST == 3 && NEXT == 4 && DOUBLE == 8 && NEGATIVE == -8
      && AFTER == -7 && COPIED == 9 && SHIFTED == 8 && a[9] == 7;
}
