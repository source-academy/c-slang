int main() {
  print(1e10);
  print(1E-10);
  print(25e+2);
  print(.5e1);
  print(5.e-1);
  print(1.e+0);
  return sizeof(1e10) == 8 && sizeof(1E-10) == 8;
}
