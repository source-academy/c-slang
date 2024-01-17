/**
 * Test implicit integer conversions, both
 * those defined in the standard, and those that are implementation defined.
 */
// TODO: add tests for global variables - they are handled differently

int main() {
  // ====== signed to unsigned int ======
  // in range - standard behaviour: no change in value
  unsigned int a = 10;
  print_int_unsigned(a);
  // out of range- standard behaviour: take lowest bits
  unsigned int b = -10;
  print_int_unsigned(b);

  
  // ====== integer promotion ======
  // signed promotion
  char _a = 10;
  short c = _a;
  print_int(c);
  int d = _a;
  print_int(d);
  long e = _a;
  print_int(e);

  // unsigned promotion
  unsigned char _b = 10;
  unsigned short f = _b;
  print_int_unsigned(f);
  unsigned int g = _b;
  print_int_unsigned(g);
  unsigned long h = _b;
  print_int_unsigned(h);

  // ====== float promotion =======
  float _c = 123.12;
  double i = _c;
  print_double(i);

  // ======= unsigned to unsigned overflow ========
  // standard behaviour: wrap (take lowest bits)
  unsigned int _d = 12345;
  unsigned char j = _d;
  print_int_unsigned(j);
  unsigned short k = _d;
  print_int_unsigned(k);


  // ====== unsigned to signed int =======
  // in range:  standard behaviour: value will be same
  unsigned int _e = 12345;
  int l = _e;
  print_int(l);
  // out of range: undefined implementation behaviour: just take lowest bits of the byte representation (similar to most compilers)
  unsigned int _f = 2147483648; // overflows signed int 32 bit
  int m = _f;
  print_int(m);

  // ====== int to float ======
  int _g = 2147483647; // cannot be represented exactly in 32bit float
  int _h = 1; // can be repesented exactly in 32 bit float
  // exact representation
  float n = _g;
  print_float(n);
  // unexact representation
  float o = _h;
  print_float(o);

  // ====== test of implicit conversions in arithmetic expressions ======
  // integer promotion
  long _i = 12345;
  int _j = 123;
  long p = _i + _j; // _j should be implictly converted to long for adding
  print_long(p);

  // integer to float conversion
  float _k = 1.4;
  float q = _k + _i; // _i should be implictly converted to float first
  print_float(q);

  // ===== TODO: Add float to int =====
}