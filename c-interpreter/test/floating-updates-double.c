int main() {
  double x = 1.5;
  if (++x != 2.5 || x != 2.5) return 0;
  if (x++ != 2.5 || x != 3.5) return 0;
  if (--x != 2.5 || x != 2.5) return 0;
  if (x-- != 2.5 || x != 1.5) return 0;
  if (sizeof(x--) != sizeof(double) || x != 1.5) return 0;
  double old = x--;
  double fresh = --x;
  if (old != 1.5 || fresh != -0.5 || x != -0.5) return 0;
  return 1;
}
