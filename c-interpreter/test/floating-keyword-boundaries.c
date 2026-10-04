int main() {
  int doubleValue = 3;
  int dox = 0;
  do {
    dox++;
    doubleValue--;
  } while (doubleValue > 0);
  double *p;
  return dox == 3 && sizeof *p == 8;
}
