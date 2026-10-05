int main() {
  int x = 5;
  if ((x += 1.75) != 6 || x != 6) return 0;
  if ((x -= 8.75f) != -2 || x != -2) return 0;
  if ((x *= 1.75) != -3 || x != -3) return 0;
  if ((x /= 2.0f) != -1 || x != -1) return 0;
  unsigned char byte = 255;
  if ((byte += 0.75) != 255 || byte != 255) return 0;
  _Bool b = 0;
  if ((b += 0.25) != 1 || b != 1) return 0;
  if ((b *= -0.0f) != 0 || b != 0) return 0;
  if ((b += 0.0 / 0.0) != 1 || b != 1) return 0;
  return 1;
}
