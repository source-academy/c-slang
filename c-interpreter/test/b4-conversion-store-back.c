int main(void) {
  signed char c = 127;
  signed char d = 127;
  signed char e = -128;
  c++;
  d += 1;
  --e;
  return (c == -128) + (d == -128) + (e == 127) - 3;
}
