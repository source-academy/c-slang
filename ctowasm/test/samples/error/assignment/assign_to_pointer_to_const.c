// attempt to assign pointer to const 
int main() {
  const int x = 10;
  const int *p = &x;
  int * const pp = p;
}