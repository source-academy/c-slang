struct S { int a[2]; char text[4]; int n; };
int visit() {
  struct S s = {.a = {1}, .text = "hi", .n = 2, .n = 5};
  int result = s.a[0] == 1 && s.a[1] == 0 && s.text[2] == 0 && s.n == 5;
  s.a[1] = 9;
  return result;
}
int main() { return visit() && visit(); }
