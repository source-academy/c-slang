struct Floats { float rows[2][2]; };
struct Doubles { struct { double rows[2][2]; } inner; };
struct Integers { int rows[2][2]; };
union Choices { float rows[2][2]; double scalar; };
int main() {
  const struct Floats f = {{{1.5f, 2.5f}, {3.5f, 4.5f}}};
  const struct Doubles d = {{{{5.5, 6.5}, {7.5, 8.5}}}};
  const struct Integers integers = {{{5, 6}, {7, 8}}};
  const union Choices choice = {.rows = {{9.25f, 10.25f}, {11.25f, 12.25f}}};
  struct Floats mutable = {{{1.25f, 2.25f}, {3.25f, 4.25f}}};
  const struct Doubles *p = &d;
  const float (*row)[2] = f.rows;
  if (f.rows[1][1] != 4.5f || row[1][0] != 3.5f) return 0;
  if (p->inner.rows[1][0] != 7.5) return 0;
  if (integers.rows[1][1] != 8 || choice.rows[1][0] != 11.25f) return 0;
  mutable.rows[1][0] += 0.5f;
  if (mutable.rows[1][0] != 3.75f) return 0;
  print(f.rows[1][1]);
  print(p->inner.rows[1][0]);
  print(integers.rows[1][1]);
  print(choice.rows[1][0]);
  print(mutable.rows[1][0]);
  return 1;
}
