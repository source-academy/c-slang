int arr[5];

int main() {
  int *p1;
  int *p2;
  p1 = arr;
  p1 += 1;
  p2 = arr;
  p2 += 3;
  return p1 - p2;
}
