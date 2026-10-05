struct S { double value; };
struct S values[2] = {{1.5}, {2.5}};
int calls = 0;

struct S *locate() {
  calls++;
  return &values[0];
}

int main() {
  int index = 0;
  values[index++].value += 0.5;
  if (index != 1 || values[0].value != 2.0) return 0;
  print(values[index++].value);
  if (index != 2) return 0;
  (*locate()).value += 1.25;
  print((*locate()).value);
  if (calls != 2 || values[0].value != 3.25) return 0;
  return 1;
}
