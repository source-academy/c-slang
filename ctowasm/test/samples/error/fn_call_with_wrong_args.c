int f1(const char c) {};
int f2(char c) {};

int f3(char a, char b) {};
int f4(char * a, char  * b) {};

int main() {
  char a = 10;
  char b = 20;
  char c = 30;
  const char d = 40;
  long e = 50;
  // shouldnt have error
  f1(a);
  f2(d);
  f2(10);
  f2(e);
  f1(e);

  // should have error
  f2(12, 213);
  f3(1231);
  f4(

}