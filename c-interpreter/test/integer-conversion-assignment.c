int main(void) {
  char c = 255;
  signed char sc = 255;
  short s = 65535;
  int i = ~0u;
  long l = ~0UL;
  long long ll = ~0ULL;
  if (c != -1 || sc != -1 || s != -1 || i != -1 || l != -1 || ll != -1)
    return 0;

  c = -257;
  sc = -257;
  s = -65537;
  i = -4294967297LL;
  l = sizeof(long) == 4 ? -4294967297LL : -1LL;
  ll = ~0ULL - 1;
  return c == -1 && sc == -1 && s == -1 && i == -1 && l == -1 && ll == -2;
}
