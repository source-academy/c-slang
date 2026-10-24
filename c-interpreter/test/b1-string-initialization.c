char staticZero[8];
unsigned char *unknown;
int main(void) {
  unsigned char *p = malloc(8);
  for (int i = 0; i < 8; i++) p[i] = 9;
  free(p);
  unknown = malloc(8);
  unknown[1] = 7;
  if (unknown[1] != 7 || staticZero[7] != 0) return 1;
  return 0;
}
