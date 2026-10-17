int main(void) {
  const char *file = __FILE__;
  int first = __LINE__;

  int second = __LINE__;
  return first == 3 && second == 5 && file[sizeof __FILE__ - 1] == '\0' ? 0 : 1;
}
