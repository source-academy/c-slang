// typedef and variable declaration with same name in same scope
int main() {
  int x;
  typedef int x;

  typedef char y;
  long y;
}