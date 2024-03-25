// Continue statement present outside loop body
// Violates continue statement constraint 6.8.6.3/1 of C17 standard
int main() {
  break;
}