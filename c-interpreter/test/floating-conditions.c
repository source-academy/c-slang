int main() {
  double negative_zero = 0.0 / (0.0 - 1.0);
  double nan = 0.0 / 0.0;
  int count = 0;
  if (negative_zero) return 0;
  if (0.0f) return 0;
  if (0.25f) count++;
  if (0.0 - 0.25) count++;
  if (nan) count++;
  if (1.0 / 0.0) count++;
  if (count != 4) return 0;
  if ((negative_zero ? 3 : 4) != 4 || (nan ? 3 : 4) != 3) return 0;
  if ((0.25f ? 5 : 6) != 5 || (0.0f ? 5 : 6) != 6) return 0;
  return 1;
}
