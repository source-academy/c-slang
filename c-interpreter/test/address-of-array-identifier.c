int arr[2][5];

int main() {
  int (*p)[2][5];
  arr[1][2] = 55;
  p = &arr;
  return (*p)[1][2];
}
