float a = 1.1;
float b = 1.1E10;
float c = 1e20;
double d = 120.9;
double e = 4.5E40;

int main() {
  float f = e;
  double g = e - d;
  print_float(a);
  print_float(b);
  print_float(c);
  print_double(d);
  print_double(e);
  print_float(f);
  print_double(g);
}
