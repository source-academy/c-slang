int main(void) {
  unsigned char u = 300;
  signed char s = -5;
  unsigned int w = -1;
  long l = 70000;
  short h = -300;
  float f = 3;
  int i = 3.9;
  return (u == 44) + (s == -5) + (w + 1 == 0) + (l == 70000) + (h == -300) +
         (f == 3) + (i == 3) - 7;
}
