// Trying to use sizeof on function type
// Violates 6.5.3.4/2 of the C17 standard

int f() {
}

int main() {
  sizeof(f);  
}