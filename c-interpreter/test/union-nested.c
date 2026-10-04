struct Pair { int x; long long y; };
union U { int first; struct Pair pair; int matrix[2][3]; };
struct Outer { char prefix; union U u; int suffix; };
int main() {
  struct Outer o = {.prefix = 1, .u = {.pair = {2, 3}}, .suffix = 4};
  union U *p = &o.u;
  p->pair.y = 9;
  int old = p->pair.x == 2 && p->pair.y == 9;
  p->matrix[1][2] = 12;
  int *q = &p->matrix[1][2];
  *q += 1;
  return old && *q == 13 && o.prefix == 1 && o.suffix == 4;
}
