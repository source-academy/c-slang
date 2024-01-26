int x;
typedef int y;
y* p; // y should be correctly interpreted as type
int main() {
  int y = 10;
  int p = 20;
  int z = y * p; // y should be correctly interpreted as variable identifier here
  print_int(z);
}