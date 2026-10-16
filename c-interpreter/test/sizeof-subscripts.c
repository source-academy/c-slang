int main(void) {
  char a[3]; int b[2][3];
  return sizeof(a) == 3 && sizeof(a[1]) == 1
    && sizeof(b[1]) == 3 * sizeof(int);
}
