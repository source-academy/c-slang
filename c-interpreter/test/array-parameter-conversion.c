int first(int values[2]) { return values[0]; }
int secondRow(int values[2][2]) { return values[1][0]; }
int character(char *text) { return text[0]; }

int main() {
  int values[2] = {7, 8};
  int matrix[2][2] = {{1, 2}, {3, 4}};
  return first(values) == 7 && secondRow(matrix) == 3 && character("hi") == 'h';
}
