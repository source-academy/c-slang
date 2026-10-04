int main() {
  if (1.25 + 2.5 != 3.75) return 0;
  if (1.25f + 2.5f != 3.75f) return 0;
  if (2 + 0.5f != 2.5f || 0.5f + 2 != 2.5f) return 0;
  if (0.25f + 0.5 != 0.75 || 0.5 + 0.25f != 0.75) return 0;
  print(1.25f + 2.5f);
  return 1;
}
