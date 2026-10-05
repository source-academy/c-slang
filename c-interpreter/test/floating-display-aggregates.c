struct Pair { float x; double y; };
struct Sample { char label; struct Pair pair; double values[2]; float grid[2][2]; };
union Alias { double first; double second; };
int main() {
  struct Pair pair = {1.5, 2.5};
  const struct Sample sample = {'A', {-0.0f, 2.5}, {1.1, 2.2}, {{1.25f, -0.0f}, {3.5f, 4.75f}}};
  union Alias alias = {.second = 6.25};
  struct { float f; double d; } anonymous = {0.1, -0.0};
  print(pair);
  print(sample);
  print(alias);
  print(anonymous);
  if (sizeof(struct Pair) != 16 || sizeof(struct Sample) != 56) return 0;
  if (sizeof(union Alias) != 8 || sample.grid[1][1] != 4.75f) return 0;
  return 1;
}
