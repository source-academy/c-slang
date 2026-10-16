int main(void) {
  int x = 1; double d = 2; int *p = &x;
  return sizeof(x) == sizeof(int) && sizeof(d) == sizeof(double)
    && sizeof(p) == sizeof(int *);
}
