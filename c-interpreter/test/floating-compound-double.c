int main() {
  double x = 5.0;
  if ((x += 1.5) != 6.5 || x != 6.5) return 0;
  if ((x -= 0.5f) != 6.0 || x != 6.0) return 0;
  if ((x *= 2) != 12.0 || x != 12.0) return 0;
  if ((x /= 2.0) != 6.0 || x != 6.0) return 0;
  if ((x /= 0.0) != 1.0 / 0.0 || x != 1.0 / 0.0) return 0;
  x *= 0.0;
  if (x == x) return 0;
  return 1;
}
