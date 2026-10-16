struct S { int rows[2][3]; };
int main(void) {
  struct S s = { .rows[1 - 1][1 + 1] = 8, .rows[1][2 - 1] = 9 };
  return s.rows[0][2] == 8 && s.rows[1][1] == 9
      && s.rows[0][0] == 0 && s.rows[1][2] == 0;
}
