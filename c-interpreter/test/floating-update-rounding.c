int main() {
  float x = 16777216.0f;
  double y = 16777216.0;
  if (++x != 16777216.0f || x++ != 16777216.0f || x != 16777216.0f) return 0;
  if (++y != 16777217.0 || y != 16777217.0) return 0;
  x = -16777216.0f;
  if (--x != -16777216.0f || x-- != -16777216.0f) return 0;
  x = -0.0f;
  float old = x++;
  if (1.0f / old != -1.0f / 0.0f || x != 1.0f) return 0;
  y = 1.0 / 0.0;
  if (++y != 1.0 / 0.0 || y-- != 1.0 / 0.0) return 0;
  x = 0.0f / 0.0f;
  old = ++x;
  if (old == old || x == x) return 0;
  return 1;
}
