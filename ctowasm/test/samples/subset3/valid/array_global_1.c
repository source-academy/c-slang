int arr[] = {1, 2, 3};
int brr[2] = {4, 5};
int crr[2];

int main() {
  arr[1] = 10;
  
  for (int i = 0; i < 2; i++) {
    crr[i] = 10 * (i + 1);
  }
  for (int i = 0; i < 3; ++i) {
    print_int(arr[i]);
  }
  for (int i = 0; i < 2; ++i) {
    print_int(brr[i]);
  }
  for (int i = 0; i < 2; ++i) {
    print_int(crr[i]);
  }
}