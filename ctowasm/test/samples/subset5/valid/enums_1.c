#include <source_stdlib>

enum E {
  a,
  b = 10,
  c,
};

enum EA {
  d = 20
} e;


int main() {
  e = d;
  enum EB {
    f = 200
  } g = f;
  print_int(e);
  print_int(g);
  print_int(a);
  print_int(b);
  print_int(400 - c);
}