struct Record { int values[3]; };

int main() {
  int matrix[3][3] = {[2][1] = 7};
  int cube[3][3][3] = {[2][1][0] = 8};
  struct Record records[3] = {[2].values[1] = 9};
  return matrix[2][1] == 7 && matrix[2][2] == 0
      && cube[2][1][0] == 8 && cube[2][2][2] == 0
      && records[2].values[1] == 9 && records[2].values[2] == 0;
}
