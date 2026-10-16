typedef int T;
enum Values { SIZE = sizeof(T), ALIGN = _Alignof(T), LETTER = 'b' - 'a' };
int main(void) {
  int x = 7;
  enum Local { UNEVALUATED = sizeof(x++), SELECTED = 1 ? 3 : 1 / 0 };
  return SIZE == sizeof(int) && ALIGN == _Alignof(int) && LETTER == 1
      && UNEVALUATED == sizeof(int) && SELECTED == 3 && x == 7;
}
