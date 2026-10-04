int main() {
  if (5.5 - 2.25 != 3.25) return 0;
  if (5.5f - 2.25f != 3.25f) return 0;
  if (2 - 0.5f != 1.5f || 0.5f - 2 != 0.0f - 1.5f) return 0;
  if (0.25f - 0.5 != 0.0 - 0.25 || 0.5 - 0.25f != 0.25) return 0;
  print(0.5f - 2);
  return 1;
}
