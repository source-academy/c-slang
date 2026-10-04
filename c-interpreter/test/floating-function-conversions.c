double widen(float value) { return value; }
float narrow(double value) { return value; }
int truncate(double value) { return value; }
double integer_argument(int value) { return value; }
float from_integer(long long value) { return value; }
double const_parameter(const double value) { return value; }
int main() {
  if (widen(0.1) != 0.10000000149011612) return 0;
  if (narrow(16777217.0) != 16777216.0f) return 0;
  if (truncate(3.9f) != 3 || truncate(0.0 - 3.9) != -3) return 0;
  if (integer_argument(3.9) != 3.0 || integer_argument(0.0 - 3.9) != 0.0 - 3.0) return 0;
  if (from_integer(4611686293305294849LL) != 4611686568183201792.0f) return 0;
  if (const_parameter(3) != 3.0 || const_parameter(4.5f) != 4.5) return 0;
  return 1;
}
