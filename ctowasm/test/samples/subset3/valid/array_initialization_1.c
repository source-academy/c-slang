// initialize array with inferred size from initializer list
int main() {
  int a[] = {1, 2, 3};
  for (int i = 0; i < 3; ++i) {
    print_int(a[i]);
  }
}