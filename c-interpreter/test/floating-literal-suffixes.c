int main() {
  print(1.5f);
  print(.5F);
  print(1e2f);
  print(5.F);
  print(1.5l);
  print(1.5L);
  return sizeof(1.5f) == 4 && sizeof(.5F) == 4
      && sizeof(1e2f) == 4 && sizeof(5.F) == 4
      && sizeof(1.5l) == 8 && sizeof(1.5L) == 8;
}
