enum { VALUE = 1 + 1 };
enum Shared { ONCE = VALUE * 3, NEXT } a, b;
int main(void) {
  enum { VALUE = VALUE + 3, AFTER };
  {
    enum { VALUE = AFTER + 1 };
    _Static_assert(VALUE == 7, "nested enumeration scope");
  }
  return VALUE == 5 && AFTER == 6 && ONCE == 6 && NEXT == 7;
}
