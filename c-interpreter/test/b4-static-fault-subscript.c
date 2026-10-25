int main(void) {
  int a[3] = { 0, 0, 0 };
  int i = 0;
  a[i] = i++;
  return a[0];
}
