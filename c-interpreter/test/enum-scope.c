enum { VALUE = 2 };

int main() {
  int result = VALUE;
  {
    int VALUE = 5;
    result += VALUE;
  }
  return result + VALUE;
}
