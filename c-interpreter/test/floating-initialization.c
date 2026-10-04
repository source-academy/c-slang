double global_double = 3;
float global_float = 0.1;
const float global_const = 1.25;
int global_int = 3.9;
double zero_double;
float zero_float;
int main() {
  const double local_double = 7;
  const float local_float = {0.1};
  int local_int = {0.0 - 3.9};
  float large = 4611686293305294849LL;
  if (global_double != 3.0 || global_float != 0.1f || global_const != 1.25f) return 0;
  if (global_int != 3 || local_int != -3) return 0;
  if (local_double != 7.0 || local_float != 0.1f) return 0;
  if (zero_double != 0.0 || zero_float != 0.0f) return 0;
  if (large != 4611686568183201792.0f) return 0;
  return 1;
}
