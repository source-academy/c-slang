int main() {
  float overflow = 1e300;
  float negative_zero = 0.0 / (0.0 - 1.0);
  double widened_zero = negative_zero;
  double nan = 0.0 / 0.0;
  float narrowed_nan = nan;
  print((float)1e300);
  print((float)(0.0 - 1e300));
  print(overflow);
  print(1.0 / widened_zero);
  if ((float)5e-324 != 0.0f || (float)1.401298464324817e-45 != 1.401298464324817e-45f) return 0;
  if ((double)narrowed_nan == (double)narrowed_nan) return 0;
  if ((int)negative_zero != 0) return 0;
  (void)nan;
  (void)(float)3;
  return 1;
}
