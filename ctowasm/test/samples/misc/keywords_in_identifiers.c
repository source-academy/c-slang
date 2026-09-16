// make sure the parser can handle keywords being present in identifiers
#include <source_stdlib>

int intfn() {
  return 1;
}

int main() {
  int ints[] = {1,2,3};
  print_int(intfn());
  print_int(ints[0]);
}