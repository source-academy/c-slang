int x = 1;

int read_x(void) { return x; }

void write_x(int v) { x = v; }

int chain_inner(void) { return x; }

int chain_outer(void) {
  int x = 9;
  return chain_inner() + x;
}

int main(void) {
  int x = 2;
  if (read_x() != 1) return 1;
  write_x(7);
  if (x != 2) return 2;
  if (read_x() != 7) return 3;
  if (chain_outer() != 16) return 4;
  return 0;
}
