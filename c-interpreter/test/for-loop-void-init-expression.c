void bump() {
  return;
}

int main() {
  int i = 0;
  for (bump(); i < 3; i = i + 1) {
  }
  return i;
}
