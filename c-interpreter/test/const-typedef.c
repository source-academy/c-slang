typedef int *P;
typedef int Matrix[2][2];
typedef const int CI;
int main() {
  int x = 1, y = 2;
  const P fixed = &x;
  P moving = fixed;
  moving = &y;
  *fixed = 3;
  const Matrix a = {{1, 2}, {3, 4}};
  Matrix b = {{5, 6}, {7, 8}};
  b[1][0] = 9;
  const CI value = 10;
  return x == 3 && *moving == 2 && a[1][1] == 4 && b[1][0] == 9 && value == 10;
}
