union U { const int fixed; int writable; struct { const int x; int y; } pair; };
int main() {
  union U u = {.writable = 2};
  u.writable = 3;
  u.pair.y = 4;
  const union U frozen = {.pair = {5, 6}};
  const union U *p = &frozen;
  return u.writable == 3 && u.pair.y == 4 && p->pair.x == 5 && p->pair.y == 6;
}
