int main(void) {
  char c = 127;
  signed char sc = -128;
  short s = 32767;
  int old_c = c++;
  int old_sc = sc--;
  int old_s = s++;
  if (old_c != 127 || c != -128 || old_sc != -128 || sc != 127
      || old_s != 32767 || s != -32768)
    return 0;

  int new_c = --c;
  int new_sc = ++sc;
  int new_s = --s;
  return new_c == 127 && c == new_c
      && new_sc == -128 && sc == new_sc
      && new_s == 32767 && s == new_s;
}
