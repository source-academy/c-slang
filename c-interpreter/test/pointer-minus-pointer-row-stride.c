int arr[2][5];

int main() {
  int (*p1)[5];
  int (*p2)[5];
  p1 = arr;
  p1 += 1;
  p2 = arr;
  return p1 - p2;
}
