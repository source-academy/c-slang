int arr[2][5];

int main() {
  int (*p)[5];
  arr[1][2] = 77;
  p = &arr[1];
  return p[0][2];
}
