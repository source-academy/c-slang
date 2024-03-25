// Continue statement present outside loop body
// Violates continue statement constraint 6.8.6.2/1 of C17 standard
int main() {
  continue;
}