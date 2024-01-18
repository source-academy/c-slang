int main() {
  int arr[2] = {1,2};
  int (*x)[2] = &arr;
  print_int((*x)[0]);
  print_int(arr);
  print_int(x);
  print_int(*x);
}