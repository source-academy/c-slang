_Bool as_bool(double value) { return value; }
int takes_bool(_Bool value) { return value; }
int main() {
  double negative_zero = 0.0 / (0.0 - 1.0);
  _Bool fraction = 0.25;
  _Bool zero = negative_zero;
  if ((_Bool)0.0 != 0 || (_Bool)negative_zero != 0) return 0;
  if ((_Bool)0.25f != 1 || (_Bool)(0.0 - 0.25) != 1) return 0;
  if ((_Bool)(0.0 / 0.0) != 1 || (_Bool)(1.0 / 0.0) != 1) return 0;
  if (fraction != 1 || zero != 0) return 0;
  if ((fraction = negative_zero) != 0 || fraction != 0) return 0;
  if ((zero = 0.0f / 0.0f) != 1 || zero != 1) return 0;
  if (as_bool(0.25) != 1 || as_bool(negative_zero) != 0) return 0;
  if (takes_bool(0.25f) != 1 || takes_bool(negative_zero) != 0) return 0;
  return 1;
}
