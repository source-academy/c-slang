int main() {
  double negative_zero = 0.0 / (0.0 - 1.0);
  float f = 3.0f;
  int count = 0;
  while (negative_zero) return 0;
  for (; negative_zero;) return 0;
  do { count++; if (count > 1) return 0; } while (negative_zero);
  while (f) { count++; f--; }
  if (count != 4) return 0;
  for (double d = 2.0; d; --d) count++;
  if (count != 6) return 0;
  f = 0.25f;
  do { count++; f -= 0.25f; } while (f);
  if (count != 7) return 0;
  double nan = 0.0 / 0.0;
  while (nan) { count++; break; }
  for (; nan;) { count++; break; }
  return count == 9;
}
