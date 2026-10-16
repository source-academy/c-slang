typedef int T;
struct S { char c; int x; };
_Static_assert(_Alignof(T) == _Alignof(int), "typedef alignment");
_Static_assert(_Alignof(char) == 1, "character alignment");
_Static_assert(_Alignof(struct S) == _Alignof(int), "aggregate alignment");
_Static_assert(_Alignof(int[3]) == _Alignof(int), "array alignment");
int main(void) { return _Alignof(T) == _Alignof(int); }
