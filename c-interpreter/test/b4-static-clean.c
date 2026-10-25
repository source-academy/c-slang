/* Sequenced, indeterminately sequenced, or on different objects: no notes. */
struct S { int a; int b; };

int f(int v) { return v; }

int g(void) { return 1; }

int main(void) {
  int i = 0;
  int c = 1;
  int x = 0;
  int a[3] = { 0, 0, 0 };
  int j = 2;
  struct S s = { 0, 1 };
  i++, i++;
  i++ && i;
  c ? i++ : i;
  i = (i++, i);
  x = f(x++);
  x = g() + g();
  {
    int b[2] = { i++, i++ };
    x = b[0] + b[1];
  }
  s.a = s.b++;
  a[0] = a[1]++;
  i = 1;
  a[i] = a[j]++;
  {
    int i = 5;
    i++;
  }
  return (i == 1) + (x == 11) + (s.a == 1) + (a[0] == 0) + (a[1] == 0) +
         (a[2] == 1) - 6;
}
