int temp[3];

int main() {
  int arr[3];
  int x = 0;
  temp[x++] = 1;
  temp[x] = 2;
  for (int i = 0; i < 3; ++i) {
    arr[i] = temp[i];
  }
}