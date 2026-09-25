int arr[3];

int main() {
  int *p = arr;
  *p = 10;
  return arr[0];
}
