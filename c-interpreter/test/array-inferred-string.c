char greeting[] = "hi";

int main() {
  char empty[] = "";
  char braced[] = {"ok"};
  char embedded[] = "a\0b";
  greeting[0] = 'H';
  return sizeof greeting == 3 && greeting[0] == 'H' && greeting[2] == 0
      && sizeof empty == 1 && empty[0] == 0
      && sizeof braced == 3 && braced[1] == 'k' && braced[2] == 0
      && sizeof embedded == 4 && embedded[2] == 'b' && embedded[3] == 0;
}
