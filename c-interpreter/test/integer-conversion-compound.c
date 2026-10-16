int main(void) {
  char c = 100;
  signed char sc = 100;
  short s = 30000;
  int i = 0;
  long l = 0;
  long long ll = 0;
  int c_result = (c += 100);
  int sc_result = (sc *= 3);
  int s_result = (s += 10000);
  int i_result = (i += ~0u);
  long l_result = (l |= ~0UL);
  long long ll_result = (ll ^= ~0ULL);
  return c == -56 && c_result == c
      && sc == 44 && sc_result == sc
      && s == -25536 && s_result == s
      && i == -1 && i_result == i
      && l == -1 && l_result == l
      && ll == -1 && ll_result == ll;
}
