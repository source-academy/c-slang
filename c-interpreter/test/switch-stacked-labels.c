int main() {
  int x = 2;
  int result = 0;
  switch (x) {
    case 1:
    case 2:
      result = 5;
      break;
    default:
      result = 99;
  }
  return result;
}
