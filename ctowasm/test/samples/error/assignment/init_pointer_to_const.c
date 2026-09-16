// attempt to intitialize pointer to non const to ptr to const 
int main() {
  const int x = 10;
  int *p = &x;
}