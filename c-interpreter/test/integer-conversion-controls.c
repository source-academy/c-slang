int main(void) {
  char c = 123;
  signed char sc = c;
  short s = sc;
  int i = s;
  long l = i;
  long long ll = l;
  unsigned char uc = -1;
  unsigned short us = 65536;
  unsigned int ui = -1;
  unsigned long ul = -1;
  unsigned long long ull = -1;
  _Bool truth = 256;
  _Bool negative = -256;
  _Bool falsehood = 0;
  unsigned int conditional = 1 ? -1 : 0u;
  return ll == 123 && (char)ll == 123
      && uc == 255 && us == 0 && ui == ~0u && ul == ~0UL && ull == ~0ULL
      && ui + 1 == 0 && ul + 1 == 0 && ull + 1 == 0
      && truth == 1 && negative == 1 && falsehood == 0 && conditional == ~0u
      && -7 % 3 == -1 && -7 / 3 == -2 && (16 >> 2) == 4
      && (16 << 2) == 64 && ~c == -124 && -c == -123;
}
