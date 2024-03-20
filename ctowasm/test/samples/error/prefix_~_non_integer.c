//// Perform prefix ~ on non integer type
// Violates 6.5.3.3/1 of C17 standard

int main() {
  float x = 10.0;
  ~x;
}