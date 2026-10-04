int main() {
  int yes = 1;
  int no = 0;
  int effects = 0;
  if ((yes ? 16777217 : 0.0f) != 16777216.0f) return 0;
  if ((no ? 0.0f : 16777217) != 16777216.0f) return 0;
  if ((yes ? 0.1f : 0.0) != 0.10000000149011612) return 0;
  if ((no ? 0.0 : 0.1f) != 0.10000000149011612) return 0;
  if ((yes ? 2.5 : ++effects) != 2.5 || effects != 0) return 0;
  if ((no ? (int)1e20 : 0.5f) != 0.5f) return 0;
  if ((yes ? 4611686293305294849LL : 0.0f) != 4611686568183201792.0f) return 0;
  return 1;
}
