struct S { const int fixed; int writable; };
int main() {
  struct S s = {1, 2};
  s.writable = 3;
  return s.fixed == 1 && s.writable == 3;
}
