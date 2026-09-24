int arr[3];

int main() {
  int *p;
  p = arr;
  *p = 10;
  p++;
  *p = 20;
  return arr[0] + arr[1] + (p == arr + 1 ? 100 : 0);
}
