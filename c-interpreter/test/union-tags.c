union Link;
union Link *identity(union Link *p);
union Link { int value; union Link *next; };
union Link *identity(union Link *p) { return p; }
struct Shared { int x; };
union Opaque;
union Opaque *opaque;
int main() {
  union Link u = {.value = 7};
  typedef union Link Link;
  Link *p = identity(&u);
  union Link link = {.next = p};
  int result = link.next->value;
  { union Local { int n; } v = {3}; result += v.n; }
  { union Shared { int x; int y; } v = {1}; result += v.y; }
  return result == 11 && opaque == 0;
}
