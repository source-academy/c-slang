struct S { float rows[2][2]; };

int main() {
  struct S s;
  s.rows[0][0] = 3.4;
  s.rows[0][0] /= 5;
  print(s.rows[0][0]);
}
