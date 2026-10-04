union U { int i; long long n; char text[8]; struct { int x; int y; } pair; };
union U global = {.n = 42};
struct Outer { union U u; int sentinel; };
int main() {
  union U first = {7};
  union U text = {.text = "hi"};
  union U changed = {.i = 2, .n = 9};
  union U repeated = {.i = 1, .i = 5};
  union U nested = {.pair.x = 3, .pair.y = 4};
  union U reset = {.pair.x = 8, .i = 2, .pair.y = 6};
  struct Outer outer = {.u.pair.x = 8, .u.i = 2, .u.pair.y = 6, .sentinel = 7};
  return first.i == 7 && global.n == 42 && text.text[1] == 'i'
      && text.text[2] == 0 && changed.n == 9 && repeated.i == 5
      && nested.pair.x == 3 && nested.pair.y == 4
      && reset.pair.x == 0 && reset.pair.y == 6
      && outer.u.pair.x == 0 && outer.u.pair.y == 6 && outer.sentinel == 7;
}
