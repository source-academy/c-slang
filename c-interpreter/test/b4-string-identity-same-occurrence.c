int main(void) {
  const char *first = 0;
  int i;
  int same = 1;
  for (i = 0; i < 3; i++) {
    const char *p = "loop";
    if (first == 0) first = p;
    else if (p != first) same = 0;
  }
  return same ? 0 : 1;
}
