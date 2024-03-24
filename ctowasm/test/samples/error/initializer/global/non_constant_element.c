// Data segment intialization without constant expression
int a = 10;
struct B { int x; int y;} x = {a};
int main() {}