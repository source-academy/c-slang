typedef int A[];
int main(void) { A a = {sizeof(a[0]), sizeof(&a)}, b = {3};
  return sizeof(a) == 2 * sizeof(int) && a[0] == sizeof(int)
    && a[1] == sizeof(&a) && sizeof(b) == sizeof(int); }
