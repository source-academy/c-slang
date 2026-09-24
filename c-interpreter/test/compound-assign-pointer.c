int arr[5];

int main() {
  int *p;
  p = arr;
  *p = 100;
  p += 2;
  *p = 200;
  p -= 1;
  return arr[0] + arr[2] + (p == arr + 1 ? 1000 : 0);
}
