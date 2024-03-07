int main() {
  int x = 10;
  // statement after switch will never be executed, although it is valid
  switch (x) x = 10;
}