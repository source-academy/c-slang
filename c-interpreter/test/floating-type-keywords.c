typedef float Real;
int main() {
  float f;
  double d;
  long double ld;
  const Real values[3];
  double *p;
  return sizeof(float) == 4 && sizeof(double) == 8
      && sizeof(long double) == 8 && sizeof f == 4
      && sizeof d == 8 && sizeof ld == 8
      && sizeof values == 12 && sizeof *p == 8;
}
