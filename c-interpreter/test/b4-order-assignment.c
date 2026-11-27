int k = 0;
int arr[2] = { 0, 0 };

int bump(void) {
  k = 1;
  return 5;
}

int main(void) {
  /* arr[k] reads k; bump() writes it through a call: a note, not a fault. */
  arr[k] = bump();
  return (arr[0] == 5) + (arr[1] == 0) - 2;
}
