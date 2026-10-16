int parameters(char c, signed char sc, short s, int i, long l, long long ll) {
  return c == -1 && sc == -1 && s == -1 && i == -1 && l == -1 && ll == -1;
}

char return_char(void) { return 255; }
signed char return_signed_char(void) { return 255; }
short return_short(void) { return 65535; }
int return_int(void) { return ~0u; }
long return_long(void) { return ~0UL; }
long long return_long_long(void) { return ~0ULL; }

int main(void) {
  return parameters(255, 255, 65535, ~0u, ~0UL, ~0ULL)
      && return_char() == -1 && return_signed_char() == -1
      && return_short() == -1 && return_int() == -1
      && return_long() == -1 && return_long_long() == -1;
}
