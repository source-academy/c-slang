int arr[3];

int main() {
  int *p = arr;
  p++;
  *p = 42;
  return arr[1] + (p == arr + 1 ? 100 : 0);
}
