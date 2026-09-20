int counter;

int sideeffect() {
  counter = counter + 1;
  return 1;
}

int main() {
  int x;
  int y;
  int a;
  int b;
  int mustSkip;
  int mustRun;

  x = 1;
  y = 0;

  counter = 0;
  a = (x == 1) || sideeffect();
  mustSkip = counter;

  counter = 0;
  b = (y == 1) || sideeffect();
  mustRun = counter;

  return mustSkip * 10 + (1 - mustRun);
}
