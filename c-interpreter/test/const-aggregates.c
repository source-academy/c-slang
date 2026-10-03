struct S { int x; int a[2]; int *p; };
int main() {
  int n = 1;
  const struct S s = {2, {3, 4}, &n};
  struct S copy = s;
  const struct S *view = &copy;
  const char text[] = "hi";
  copy.x = 5;
  copy.a[0] = 6;
  *s.p = 7;
  return s.x == 2 && s.a[1] == 4 && view->x == 5
      && copy.a[0] == 6 && n == 7 && text[1] == 'i' && sizeof text == 3;
}
