int visit() {
  for (int i = 0; i < 3; i++) {
    const int n = i;
    if (n == 0) continue;
    if (n == 1) break;
  }
  return 1;
}
int main() { return visit() && visit(); }
