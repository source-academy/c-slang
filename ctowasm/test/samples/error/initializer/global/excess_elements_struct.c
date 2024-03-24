// Excess elements in initializer of struct
// Violates 6.7.9/1 of C17 standard
struct B { int x; };
struct A { struct B b; int x; } x = { {1}, 2, 3 };
int main() {
}