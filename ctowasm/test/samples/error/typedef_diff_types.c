// Test throwing error when two conflicting typedefs with different types
// these 2 are ok as they declare same type
typedef int x;
typedef int x;

// these 2 are not
typedef int b;
typedef char b;

int main() {
  // these 2 declarations are ok as they declare same type
  typedef int ok;
  typedef int ok;

  // these 2 are not
  typedef int t;
  typedef char t; 
}