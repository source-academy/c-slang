int main(void) {
  int calls = 0;
  int *p = malloc(4.9 + calls++);
  *p = 7;
  if (*p != 7 || calls != 1) return 1;
  free(p);
  print(3.5);
  return 0;
}
