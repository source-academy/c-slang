struct X { int x; };
struct X { int x; };

struct Y;
enum Y { x }; 

int main() {
  enum X;
  struct X;

  enum A;
  struct A { int x; };
}