int main() {
  if (7.5 / 2.5 != 3.0) return 0;
  if (7.5f / 2.5f != 3.0f) return 0;
  if (2 / 0.5f != 4.0f || 0.5f / 2 != 0.25f) return 0;
  if (0.25f / 0.5 != 0.5 || 0.5 / 0.25f != 2.0) return 0;
  if (1.0f / 10.0f != 0.1f || 1.0 / 10 != 0.1) return 0;
  print(1.0f / 10.0f);
  return 1;
}
