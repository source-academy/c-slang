int main() {
  double d = 0.0;
  float f = 0.0f;
  int i = 0;
  unsigned char byte = 0;
  double *p = &d;
  if ((d = 3) != 3.0 || d != 3.0) return 0;
  if ((i = 0.0 - 3.9) != -3 || i != -3) return 0;
  if ((f = 0.1) != 0.1f || f != 0.1f) return 0;
  if ((d = f) != 0.10000000149011612) return 0;
  if ((byte = 255.75) != 255 || byte != 255) return 0;
  if ((d = f = 16777217.0) != 16777216.0) return 0;
  if ((i = f = 3.9) != 3 || f != 3.9f) return 0;
  if ((*p = 4.5f) != 4.5 || d != 4.5) return 0;
  if ((f = f) != 3.9f) return 0;
  return 1;
}
