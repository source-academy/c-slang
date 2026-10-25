int main(void) {
  int x = -8;
  int y = x >> 1;
  int z = 8 >> 1;
  unsigned int u = 8;
  unsigned int v = u >> 1;
  int w = -8;
  w >>= 2;
  return (y == -4) + (z == 4) + (v == 4) + (w == -2) - 4;
}
