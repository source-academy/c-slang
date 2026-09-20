struct S {
  int row[5];
};

struct S s;

int main() {
  int (*p)[5];
  s.row[2] = 88;
  p = &s.row;
  return p[0][2];
}
