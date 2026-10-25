int g = 0;
int arr[4] = { 0, 0, 0, 0 };
struct S { int x; int y; } s = { 0, 0 };

int bump(void) {
  g += 10;
  arr[2] += 7;
  s.y += 3;
  return g + arr[2] + s.y;
}

int main(void) {
  int r1 = g + bump();
  int r2 = arr[2] + bump();
  int r3 = s.y + bump();
  return (r1 == 20) + (r2 == 47) + (r3 == 66) - 3;
}
