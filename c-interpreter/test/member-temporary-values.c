struct Pair { double value; };
struct Outer { struct Pair inner; };
int calls = 0;

struct Outer make() {
  struct Outer result = {{1.25}};
  calls++;
  return result;
}

int main() {
  struct Pair a = {2.5}, b = {3.75};
  print(make().inner.value);
  print((a = b).value);
  print((1 ? a : b).value);
  print((calls++, a).value);
  if (calls != 2 || a.value != 3.75) return 0;
  return 1;
}
