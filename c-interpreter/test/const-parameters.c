int sum(int);
int sum(const int n) {
  const int local = n;
  if (n == 0) return local;
  return local + sum(n - 1);
}
int read(const int []);
int read(const int values[]) { return values[0]; }
void visit(int n) { const int x = n; }
int main() {
  int a[2] = {7, 8};
  visit(1); visit(2);
  for (int i = 0; i < 3; i++) { const int local = i; }
  return sum(3) == 6 && sum(2) == 3 && read(a) == 7;
}
