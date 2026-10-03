const int global;
int main() {
  const const int x = 3;
  const int unused;
  int y = x;
  int * const p = &y;
  *p += 2;
  return global == 0 && y == 5 && sizeof unused == sizeof(int);
}
