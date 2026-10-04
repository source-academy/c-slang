union U { int word; int values[3]; };
int visit(int n) {
  union U u = {.values = {n}};
  int zero = u.values[1] == 0 && u.values[2] == 0;
  u.values[1] = 99;
  u.values[2] = 88;
  if (n > 0) return zero && visit(n - 1);
  return zero;
}
int main() {
  int ok = visit(2) && visit(1);
  for (int i = 0; i < 3; i++) {
    const union U u = {.values = {i}};
    ok = ok && u.values[0] == i && u.values[1] == 0;
  }
  return ok;
}
