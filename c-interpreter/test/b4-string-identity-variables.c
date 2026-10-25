int main(void) {
  const char *a = "abc";
  const char *b = "abc";
  return (a == b) + (a != b) - 1;
}
