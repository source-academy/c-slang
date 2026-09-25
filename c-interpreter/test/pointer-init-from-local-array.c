int main() {
  int arr[3];
  arr[0] = 1;
  arr[1] = 2;
  arr[2] = 3;
  int *p = arr;
  return p[0] + p[1] + p[2];
}
