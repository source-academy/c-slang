int choose(int value) {
  int result = 0;
  switch (value) {
    case 1 + 1:
    case 1 + 2:
      result = 3;
    case 2 * 2:
      result += 4;
      break;
    default: result = 9;
  }
  return result;
}
int main(void) {
  return choose(2) == 7 && choose(3) == 7 && choose(4) == 4 && choose(0) == 9;
}
