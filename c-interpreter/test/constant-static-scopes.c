enum { VALUE = 3 };
_Static_assert(VALUE * 2 == 6, "file " "scope");
struct S {
  _Static_assert(VALUE == 3, "struct scope");
  int x;
};
union U {
  _Static_assert(sizeof(int) >= 2, "union scope");
  int x;
};
int main(void) {
  enum { VALUE = 7 };
  _Static_assert(VALUE - 1 == 6, "block scope");
  struct S s = { 4 };
  union U u = { 5 };
  return s.x == 4 && u.x == 5 && sizeof(struct S) == sizeof(int);
}
