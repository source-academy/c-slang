int sparse[] = {[4] = 9};

int main() {
  int mixed[] = {[3] = 7, 8, [1] = 2};
  int nested[][3] = {[2][1] = 6};
  return sizeof sparse == 5 * sizeof(int) && sparse[0] == 0 && sparse[4] == 9
      && sizeof mixed == 5 * sizeof(int) && mixed[0] == 0
      && mixed[1] == 2 && mixed[2] == 0 && mixed[3] == 7 && mixed[4] == 8
      && sizeof nested == 9 * sizeof(int) && nested[2][0] == 0
      && nested[2][1] == 6 && nested[2][2] == 0;
}
