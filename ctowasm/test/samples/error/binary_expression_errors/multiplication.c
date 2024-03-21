// Test violating constraint on multiplication as per 6.5.5/2 of C17 standard

int main() {
  int *p;
  p * 4; // does not fulfill any constraint
}