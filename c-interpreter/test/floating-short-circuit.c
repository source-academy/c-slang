int main() {
  double negative_zero = 0.0 / (0.0 - 1.0);
  double nan = 0.0 / 0.0;
  int effects = 0;
  int zero = 0;
  if ((negative_zero && ++effects) != 0 || effects != 0) return 0;
  if ((nan || ++effects) != 1 || effects != 0) return 0;
  if ((negative_zero || ++effects) != 1 || effects != 1) return 0;
  if ((nan && ++effects) != 1 || effects != 2) return 0;
  if ((negative_zero && (1 / zero)) != 0) return 0;
  if ((0.5f || (1 / zero)) != 1) return 0;
  float x = 0.5f;
  if ((x && x++) != 1 || x != 1.5f) return 0;
  return 1;
}
