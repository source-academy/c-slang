// incompatible struct in intializer list
int main() {
  struct X { int x; };
  struct Y { float y; } y;
  struct X x = y;
}