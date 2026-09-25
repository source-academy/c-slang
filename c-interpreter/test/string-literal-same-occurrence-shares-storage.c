int main() {
  char *first = 0;
  char *last = 0;
  int i = 0;
  while (i < 3) {
    char *p = "same";
    if (i == 0) first = p;
    last = p;
    i++;
  }
  return first == last ? 1 : 0;
}
