int main() {
  const float small = 0.1f;
  const double precise = 0.1;
  long double wide = 9.125L;
  print(1.5f);
  print(2.5);
  print(small);
  print(precise);
  print(wide);
  print(1e30);
  print(1e-30);
  print(1.401298464324817e-45f);
  print(5e-324);
  if (sizeof(float) != 4 || sizeof(double) != 8 || sizeof wide != 8) return 0;
  return 1;
}
